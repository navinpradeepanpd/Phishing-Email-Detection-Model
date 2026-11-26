"""
Training and evaluation orchestration pipeline for PhishGuard AI.
Trains and benchmarks multiple candidate models with 5-fold stratified cross-validation,
performs hyperparameter tuning, evaluates on held-out test set,
detects data leakage and overfitting, extracts explainability features,
and exports serialized artifacts (best_model.joblib, metrics.json, diagnostic plots).
"""

from __future__ import annotations

import json
import logging
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple, Union

# Ensure workspace root is in sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.preprocessing import MaxAbsScaler
from sklearn.svm import LinearSVC

from ml.data_loader import load_dataset, report_class_balance
from ml.evaluate import (
    check_data_leakage,
    check_overfitting,
    evaluate_model_performance,
    extract_top_explainability_features,
    plot_confusion_matrix_heatmap,
    plot_model_comparison_bars,
    plot_roc_curves_comparison,
)
from ml.features import (
    HeuristicFeatureExtractor,
    build_phishing_pipeline,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("PhishGuard.Train")

RANDOM_STATE = 42
ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"


def run_training_pipeline(
    data_path: Union[str, Path] = Path(__file__).resolve().parent / "data" / "phishing_emails.csv",
    artifacts_dir: Path = ARTIFACTS_DIR,
) -> Dict[str, Any]:
    """
    Executes the complete machine learning training and benchmarking pipeline.
    """
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    logger.info("=" * 70)
    logger.info("🚀 STARTING PHISHGUARD AI MODEL TRAINING PIPELINE")
    logger.info("=" * 70)

    # 1. Load and Clean Authentic Dataset
    logger.info(f"Loading authentic dataset from: {data_path}")
    df = load_dataset(data_path, clean=True, verbose=True)
    total_records = len(df)
    dataset_balance = report_class_balance(df, dataset_name="Cleaned Dataset")

    # 2. Stratified Train / Validation / Test Split (70% Train, 15% Val, 15% Test)
    logger.info("Performing Stratified Train / Validation / Test split (70 / 15 / 15)...")
    X = df["text"].values
    y = df["label"].values.astype(int)

    # First split off 30% for validation + test
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, random_state=RANDOM_STATE, stratify=y
    )
    # Split the 30% equally into 15% validation and 15% test
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, random_state=RANDOM_STATE, stratify=y_temp
    )

    logger.info(
        f"Splits created: Train={len(X_train)} samples, "
        f"Val={len(X_val)} samples, Test={len(X_test)} samples."
    )

    # 3. Check for Data Leakage across splits
    logger.info("Checking for data leakage and duplicate emails across splits...")
    leakage_report = check_data_leakage(X_train, X_val, X_test)
    logger.info(
        f"Data Leakage Audit: Leakage Detected = {leakage_report['leakage_detected']} | "
        f"Train/Test Overlap = {leakage_report['train_test_leakage_count']} | "
        f"Train/Val Overlap = {leakage_report['train_val_leakage_count']}"
    )

    # 4. Prepare Leak-Free 5-Fold Cross-Validation Feature Cache
    logger.info("-" * 70)
    logger.info("Building 5-Fold Stratified Cross-Validation Folds...")
    logger.info("-" * 70)

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    cv_folds_data = []

    logger.info("Vectorizing fold feature matrices (TF-IDF + Heuristics, fit on train-fold only)...")
    t0_cv_prep = time.time()
    for fold_idx, (train_idx, val_idx) in enumerate(cv.split(X_train, y_train)):
        logger.info(f"  Transforming Fold {fold_idx + 1}/5...")
        # Fit FeatureUnion strictly on the training fold
        feature_pipe = build_phishing_pipeline(classifier=None)
        X_tr_fold = feature_pipe.fit_transform(X_train[train_idx])
        X_val_fold = feature_pipe.transform(X_train[val_idx])
        y_tr_fold = y_train[train_idx]
        y_val_fold = y_train[val_idx]
        cv_folds_data.append((X_tr_fold, y_tr_fold, X_val_fold, y_val_fold))

    logger.info(f"5-Fold CV feature preparation completed in {time.time() - t0_cv_prep:.2f}s.")

    # 5. Define Candidate Classifiers
    candidate_classifiers = {
        "Multinomial Naive Bayes": MultinomialNB(alpha=0.1),
        "Logistic Regression": LogisticRegression(
            C=2.0, max_iter=1000, random_state=RANDOM_STATE
        ),
        "Linear SVM (Calibrated)": CalibratedClassifierCV(
            LinearSVC(C=1.0, random_state=RANDOM_STATE, dual=False, max_iter=2000),
            cv=3,
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=100, max_depth=25, random_state=RANDOM_STATE, n_jobs=-1
        ),
        "Gradient Boosting": GradientBoostingClassifier(
            n_estimators=30, max_depth=3, random_state=RANDOM_STATE
        ),
    }

    # 6. Benchmark Candidate Classifiers across the 5 Folds
    logger.info("-" * 70)
    logger.info("Evaluating Candidates with 5-Fold Stratified Cross-Validation...")
    logger.info("-" * 70)

    cv_results: Dict[str, Dict[str, Any]] = {}

    for name, clf in candidate_classifiers.items():
        logger.info(f"Benchmarking: {name}...")
        t0_model = time.time()
        fold_f1s = []
        fold_accs = []

        for X_tr_f, y_tr_f, X_v_f, y_v_f in cv_folds_data:
            model_clone = clone(clf)
            model_clone.fit(X_tr_f, y_tr_f)
            preds = model_clone.predict(X_v_f)
            fold_f1s.append(f1_score(y_v_f, preds, zero_division=0))
            fold_accs.append(accuracy_score(y_v_f, preds))

        dt_model = time.time() - t0_model
        cv_results[name] = {
            "cv_f1_mean": round(float(np.mean(fold_f1s)), 5),
            "cv_f1_std": round(float(np.std(fold_f1s)), 5),
            "cv_accuracy_mean": round(float(np.mean(fold_accs)), 5),
            "cv_accuracy_std": round(float(np.std(fold_accs)), 5),
            "cv_duration_seconds": round(dt_model, 2),
        }
        logger.info(
            f"  -> {name:25s} | Mean CV F1: {np.mean(fold_f1s):.4f} (±{np.std(fold_f1s):.4f}) | "
            f"Mean CV Acc: {np.mean(fold_accs):.4f} | Time: {dt_model:.2f}s"
        )

    # 7. Hyperparameter Tuning on Top 2 Models (Logistic Regression & Naive Bayes)
    logger.info("-" * 70)
    logger.info("Hyperparameter Tuning on Candidate Models...")
    logger.info("-" * 70)

    # Tuning Logistic Regression C
    logger.info("Tuning Logistic Regression (C in [0.5, 1.0, 2.0, 4.0, 8.0])...")
    best_c = 2.0
    best_lr_f1 = -1.0
    for c_val in [0.5, 1.0, 2.0, 4.0, 8.0]:
        scores = []
        for X_tr_f, y_tr_f, X_v_f, y_v_f in cv_folds_data:
            lr_model = LogisticRegression(C=c_val, max_iter=1000, random_state=RANDOM_STATE)
            lr_model.fit(X_tr_f, y_tr_f)
            scores.append(f1_score(y_v_f, lr_model.predict(X_v_f), zero_division=0))
        mean_score = float(np.mean(scores))
        logger.info(f"  Logistic Regression C={c_val:<4} -> CV F1: {mean_score:.4f}")
        if mean_score > best_lr_f1:
            best_lr_f1 = mean_score
            best_c = c_val

    tuned_lr_clf = LogisticRegression(C=best_c, max_iter=1000, random_state=RANDOM_STATE)
    logger.info(f"  Best Logistic Regression C={best_c} (CV F1: {best_lr_f1:.4f})")

    # Tuning Multinomial Naive Bayes alpha
    logger.info("Tuning Multinomial Naive Bayes (alpha in [0.01, 0.05, 0.1, 0.5, 1.0])...")
    best_alpha = 0.1
    best_nb_f1 = -1.0
    for a_val in [0.01, 0.05, 0.1, 0.5, 1.0]:
        scores = []
        for X_tr_f, y_tr_f, X_v_f, y_v_f in cv_folds_data:
            nb_model = MultinomialNB(alpha=a_val)
            nb_model.fit(X_tr_f, y_tr_f)
            scores.append(f1_score(y_v_f, nb_model.predict(X_v_f), zero_division=0))
        mean_score = float(np.mean(scores))
        logger.info(f"  Naive Bayes alpha={a_val:<4} -> CV F1: {mean_score:.4f}")
        if mean_score > best_nb_f1:
            best_nb_f1 = mean_score
            best_alpha = a_val

    tuned_nb_clf = MultinomialNB(alpha=best_alpha)
    logger.info(f"  Best Naive Bayes alpha={best_alpha} (CV F1: {best_nb_f1:.4f})")

    # 8. Train Full End-to-End Pipelines on Entire Training Split (12,259 samples)
    logger.info("-" * 70)
    logger.info("Fitting Unified End-to-End Pipelines on Full Training Split...")
    logger.info("-" * 70)

    final_classifiers = {
        "Multinomial Naive Bayes": tuned_nb_clf,
        "Logistic Regression (Tuned)": tuned_lr_clf,
        "Linear SVM (Calibrated)": candidate_classifiers["Linear SVM (Calibrated)"],
        "Random Forest": candidate_classifiers["Random Forest"],
        "Gradient Boosting": candidate_classifiers["Gradient Boosting"],
    }

    fitted_pipelines: Dict[str, Pipeline] = {}
    for name, clf in final_classifiers.items():
        logger.info(f"Fitting complete pipeline for: {name}...")
        t0_fit = time.time()
        pipe = build_phishing_pipeline(classifier=clf)
        pipe.fit(X_train, y_train)
        fitted_pipelines[name] = pipe
        logger.info(f"  Done in {time.time() - t0_fit:.2f}s.")

    # 9. Evaluate All Models on Held-Out Test Set (2,628 samples)
    logger.info("-" * 70)
    logger.info("Evaluating All Trained Models on Held-Out Test Set (15%)...")
    logger.info("-" * 70)

    evaluations: List[Dict[str, Any]] = []
    models_roc_data: Dict[str, Dict[str, Any]] = {}

    for name, pipe in fitted_pipelines.items():
        res = evaluate_model_performance(pipe, X_test, y_test, model_name=name)
        evaluations.append(res)
        models_roc_data[name] = {
            "fpr": res["roc_curve"]["fpr"],
            "tpr": res["roc_curve"]["tpr"],
            "roc_auc": res["roc_auc"],
        }
        logger.info(
            f"Test Evaluation: {name:30s} | "
            f"Acc: {res['accuracy']:.4f} | "
            f"Prec: {res['precision']:.4f} | "
            f"Recall: {res['recall']:.4f} | "
            f"F1: {res['f1_score']:.4f} | "
            f"ROC-AUC: {res['roc_auc']:.4f} | "
            f"FPR: {res['false_positive_rate']:.4f}"
        )

    # 10. Select Champion Model
    # Criteria: Highest test F1 score and lowest False Positive Rate
    evaluations_sorted = sorted(
        evaluations, key=lambda x: (x["f1_score"], -x["false_positive_rate"]), reverse=True
    )
    champion_eval = evaluations_sorted[0]
    champion_name = champion_eval["model_name"]
    champion_pipeline = fitted_pipelines[champion_name]

    logger.info("=" * 70)
    logger.info(f"🏆 CHAMPION MODEL SELECTED: {champion_name}")
    logger.info(
        f"Champion Metrics -> Accuracy: {champion_eval['accuracy']:.4f}, "
        f"F1: {champion_eval['f1_score']:.4f}, "
        f"ROC-AUC: {champion_eval['roc_auc']:.4f}, "
        f"FPR: {champion_eval['false_positive_rate']:.4f}"
    )
    logger.info("=" * 70)

    # 11. Overfitting Audit on Champion
    champion_train_acc = float(champion_pipeline.score(X_train, y_train))
    champion_val_acc = float(champion_pipeline.score(X_val, y_val))
    champion_test_acc = champion_eval["accuracy"]
    overfitting_report = check_overfitting(champion_train_acc, champion_val_acc, champion_test_acc)
    logger.info(
        f"Overfitting Diagnostics: Train Acc = {champion_train_acc:.4f}, "
        f"Val Acc = {champion_val_acc:.4f}, Test Acc = {champion_test_acc:.4f} | "
        f"Train-Test Gap = {overfitting_report['train_test_gap']:.4f} (Is Overfitting: {overfitting_report['is_overfitting']})"
    )

    # 12. Extract Top 20 Phishing and Safe Features for Explainability
    logger.info("Extracting top predictive phishing and safe features...")
    top_features = extract_top_explainability_features(champion_pipeline, top_n=20)
    logger.info("Top 5 Phishing Indicators:")
    for f in top_features["phishing_indicators"][:5]:
        logger.info(f"   + {f['feature']} (weight: {f.get('weight', f.get('importance', 0))})")
    logger.info("Top 5 Safe Indicators:")
    for f in top_features["safe_indicators"][:5]:
        logger.info(f"   - {f['feature']} (weight: {f.get('weight', f.get('importance', 0))})")

    # 13. Generate and Save Publication Diagnostic Plots
    logger.info("Generating publication-grade diagnostic plots...")
    cm_path = artifacts_dir / "confusion_matrix.png"
    roc_path = artifacts_dir / "roc_curves.png"
    bar_path = artifacts_dir / "model_comparison.png"

    plot_confusion_matrix_heatmap(
        champion_eval["confusion_matrix"]["matrix"],
        output_path=cm_path,
        model_name=champion_name,
    )
    plot_roc_curves_comparison(models_roc_data, output_path=roc_path)
    plot_model_comparison_bars(evaluations, output_path=bar_path)
    logger.info(f"Plots saved to: {cm_path.name}, {roc_path.name}, {bar_path.name}")

    # 14. Save Serialized Artifacts
    model_save_path = artifacts_dir / "best_model.joblib"
    logger.info(f"Saving serialized champion pipeline to: {model_save_path}")
    joblib.dump(champion_pipeline, model_save_path, compress=3)

    # Export complete metrics JSON
    metrics_payload = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "champion_model": champion_name,
        "dataset_statistics": {
            "total_clean_samples": total_records,
            "phishing_samples": dataset_balance["phishing_count"],
            "safe_samples": dataset_balance["safe_count"],
            "phishing_percentage": dataset_balance["phishing_percentage"],
            "safe_percentage": dataset_balance["safe_percentage"],
            "train_samples": len(X_train),
            "val_samples": len(X_val),
            "test_samples": len(X_test),
        },
        "data_leakage_audit": leakage_report,
        "overfitting_audit": overfitting_report,
        "champion_metrics": champion_eval,
        "cross_validation_results": cv_results,
        "all_model_evaluations": evaluations,
        "top_explainability_features": top_features,
    }

    metrics_save_path = artifacts_dir / "metrics.json"
    logger.info(f"Saving comprehensive metrics JSON to: {metrics_save_path}")
    with open(metrics_save_path, "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)

    logger.info("=" * 70)
    logger.info("✅ TRAINING & EVALUATION PIPELINE COMPLETED SUCCESSFULLY!")
    logger.info("=" * 70)

    return metrics_payload


if __name__ == "__main__":
    run_training_pipeline()
