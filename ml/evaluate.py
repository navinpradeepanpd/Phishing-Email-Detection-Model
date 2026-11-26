"""
Model evaluation, explainability, and visualization module for PhishGuard AI.
Calculates authentic metrics, false-positive rates, ROC curves, confusion matrices,
top explainability features, and generates publication-grade diagnostic plots.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

# Ensure workspace root is in sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for headless plotting
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)


def evaluate_model_performance(
    pipeline: Any,
    X_test: Sequence[str],
    y_test: np.ndarray,
    model_name: str = "Model",
) -> Dict[str, Any]:
    """
    Evaluates a trained pipeline on held-out test data.
    Computes exact, authentic performance metrics with zero fabrication.
    """
    y_pred = pipeline.predict(X_test)

    # Probabilities / decision scores for ROC-AUC
    y_scores: Optional[np.ndarray] = None
    if hasattr(pipeline, "predict_proba"):
        try:
            y_scores = pipeline.predict_proba(X_test)[:, 1]
        except Exception:
            y_scores = None

    if y_scores is None and hasattr(pipeline, "decision_function"):
        try:
            y_scores = pipeline.decision_function(X_test)
        except Exception:
            y_scores = None

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))

    if y_scores is not None:
        try:
            roc_auc = float(roc_auc_score(y_test, y_scores))
            fpr, tpr, thresh = roc_curve(y_test, y_scores)
            # Sample down ROC points for clean JSON export (max 100 points)
            step = max(1, len(fpr) // 100)
            roc_curve_data = {
                "fpr": [round(float(x), 5) for x in fpr[::step]],
                "tpr": [round(float(x), 5) for x in tpr[::step]],
            }
        except Exception:
            roc_auc = 0.0
            roc_curve_data = {"fpr": [0.0, 1.0], "tpr": [0.0, 1.0]}
    else:
        roc_auc = 0.0
        roc_curve_data = {"fpr": [0.0, 1.0], "tpr": [0.0, 1.0]}

    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = [int(v) for v in cm.ravel()]

    total_safe = tn + fp
    total_phish = fn + tp
    fpr_rate = round(fp / total_safe, 5) if total_safe > 0 else 0.0
    fnr_rate = round(fn / total_phish, 5) if total_phish > 0 else 0.0

    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    results = {
        "model_name": model_name,
        "accuracy": round(acc, 5),
        "precision": round(prec, 5),
        "recall": round(rec, 5),
        "f1_score": round(f1, 5),
        "roc_auc": round(roc_auc, 5),
        "false_positive_rate": fpr_rate,
        "false_negative_rate": fnr_rate,
        "confusion_matrix": {
            "tn": tn,
            "fp": fp,
            "fn": fn,
            "tp": tp,
            "matrix": [[tn, fp], [fn, tp]],
        },
        "classification_report": report,
        "roc_curve": roc_curve_data,
    }
    return results


def extract_top_explainability_features(
    pipeline: Any,
    top_n: int = 20,
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Extracts the most influential features indicating Phishing (positive weights)
    and indicating Safe (negative weights) from the model.
    """
    feature_union = pipeline.named_steps.get("features")
    classifier = pipeline.named_steps.get("classifier")

    if feature_union is None or classifier is None:
        return {"phishing_indicators": [], "safe_indicators": []}

    # Extract all combined feature names in exact order
    feature_names: List[str] = []
    for name, transformer in feature_union.transformer_list:
        if hasattr(transformer, "get_feature_names_out"):
            sub_names = transformer.get_feature_names_out()
            feature_names.extend([f"{name}__{fn}" for fn in sub_names])
        elif hasattr(transformer, "named_steps"):
            # It is a sub-pipeline
            extractor = transformer.named_steps.get("extractor")
            if extractor and hasattr(extractor, "get_feature_names_out"):
                sub_names = extractor.get_feature_names_out()
                feature_names.extend([f"{name}__{fn}" for fn in sub_names])
            else:
                feature_names.extend([f"{name}__feat_{i}" for i in range(16)])
        else:
            feature_names.extend([f"{name}__feat_{i}" for i in range(16)])

    # Coefficients or feature importances
    phishing_features: List[Dict[str, Any]] = []
    safe_features: List[Dict[str, Any]] = []

    coefs = None
    # 1. Direct linear model
    if hasattr(classifier, "coef_"):
        coefs = classifier.coef_.ravel()
    # 2. CalibratedClassifierCV wrapping a linear model
    elif hasattr(classifier, "calibrated_classifiers_"):
        try:
            sub_coefs = [
                cc.estimator.coef_.ravel()
                for cc in classifier.calibrated_classifiers_
                if hasattr(cc.estimator, "coef_")
            ]
            if sub_coefs:
                coefs = np.mean(sub_coefs, axis=0)
        except Exception:
            coefs = None

    if coefs is not None and len(coefs) == len(feature_names):
        sorted_indices = np.argsort(coefs)
        # Most negative coefficients -> Safe indicators
        for idx in sorted_indices[:top_n]:
            clean_name = feature_names[idx].replace("tfidf__", "word: ").replace("heuristics__", "heuristic: ")
            safe_features.append(
                {"feature": clean_name, "weight": round(float(coefs[idx]), 4)}
            )

        # Most positive coefficients -> Phishing indicators
        for idx in reversed(sorted_indices[-top_n:]):
            clean_name = feature_names[idx].replace("tfidf__", "word: ").replace("heuristics__", "heuristic: ")
            phishing_features.append(
                {"feature": clean_name, "weight": round(float(coefs[idx]), 4)}
            )

    # 3. Tree Feature Importances (RandomForest / GradientBoosting)
    elif hasattr(classifier, "feature_importances_"):
        importances = classifier.feature_importances_
        if len(importances) == len(feature_names):
            sorted_indices = np.argsort(importances)
            for idx in reversed(sorted_indices[-top_n:]):
                clean_name = feature_names[idx].replace("tfidf__", "word: ").replace("heuristics__", "heuristic: ")
                phishing_features.append(
                    {"feature": clean_name, "importance": round(float(importances[idx]), 4)}
                )

    return {
        "phishing_indicators": phishing_features,
        "safe_indicators": safe_features,
    }


def check_data_leakage(
    train_texts: Sequence[str],
    val_texts: Sequence[str],
    test_texts: Sequence[str],
) -> Dict[str, Any]:
    """
    Checks for exact text overlap and data leakage across train, val, and test splits.
    """
    train_set = set(train_texts)
    val_set = set(val_texts)
    test_set = set(test_texts)

    train_val_overlap = len(train_set.intersection(val_set))
    train_test_overlap = len(train_set.intersection(test_set))
    val_test_overlap = len(val_set.intersection(test_set))

    leakage_detected = (train_val_overlap + train_test_overlap + val_test_overlap) > 0

    return {
        "train_samples": len(train_texts),
        "val_samples": len(val_texts),
        "test_samples": len(test_texts),
        "train_unique": len(train_set),
        "val_unique": len(val_set),
        "test_unique": len(test_set),
        "train_val_leakage_count": train_val_overlap,
        "train_test_leakage_count": train_test_overlap,
        "val_test_leakage_count": val_test_overlap,
        "leakage_detected": leakage_detected,
    }


def check_overfitting(
    train_acc: float,
    val_acc: float,
    test_acc: float,
    threshold: float = 0.08,
) -> Dict[str, Any]:
    """
    Checks if model is overfitting by comparing training accuracy to validation/test accuracy.
    """
    train_val_gap = round(train_acc - val_acc, 4)
    train_test_gap = round(train_acc - test_acc, 4)
    is_overfitting = (train_val_gap > threshold) or (train_test_gap > threshold)

    return {
        "train_accuracy": train_acc,
        "val_accuracy": val_acc,
        "test_accuracy": test_acc,
        "train_val_gap": train_val_gap,
        "train_test_gap": train_test_gap,
        "is_overfitting": is_overfitting,
        "threshold": threshold,
    }


# =========================================================================
# PLOTTING FUNCTIONS
# =========================================================================

def plot_confusion_matrix_heatmap(
    cm: List[List[int]],
    output_path: Union[str, Path],
    model_name: str = "PhishGuard AI Best Model",
) -> None:
    """Generates and saves a clean confusion matrix heatmap PNG."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    matrix = np.array(cm)
    tn, fp, fn, tp = matrix.ravel()
    total = tn + fp + fn + tp

    fig, ax = plt.subplots(figsize=(6, 5), dpi=150)
    cax = ax.imshow(matrix, cmap="Blues", interpolation="nearest")
    fig.colorbar(cax, ax=ax, fraction=0.046, pad=0.04)

    classes = ["Safe Mail (0)", "Phishing (1)"]
    ax.set_xticks([0, 1])
    ax.set_yticks([0, 1])
    ax.set_xticklabels(classes, fontsize=10, fontweight="bold")
    ax.set_yticklabels(classes, fontsize=10, fontweight="bold")
    ax.set_xlabel("Predicted Label", fontsize=11, labelpad=8)
    ax.set_ylabel("True Ground Truth Label", fontsize=11, labelpad=8)
    ax.set_title(f"Confusion Matrix\n{model_name}", fontsize=12, fontweight="bold", pad=12)

    # Annotate counts and percentages
    cell_labels = [
        [f"True Safe (TN)\n{tn:,}\n({tn/total:.1%})", f"False Phish (FP)\n{fp:,}\n({fp/total:.1%})"],
        [f"False Safe (FN)\n{fn:,}\n({fn/total:.1%})", f"True Phish (TP)\n{tp:,}\n({tp/total:.1%})"],
    ]

    for i in range(2):
        for j in range(2):
            color = "white" if matrix[i, j] > (matrix.max() / 2) else "black"
            ax.text(j, i, cell_labels[i][j], ha="center", va="center", color=color, fontsize=10, fontweight="semibold")

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches="tight")
    plt.close()


def plot_roc_curves_comparison(
    models_roc_data: Dict[str, Dict[str, Any]],
    output_path: Union[str, Path],
) -> None:
    """Generates and saves multi-model ROC Curves comparison plot."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(7, 6), dpi=150)
    ax.plot([0, 1], [0, 1], "k--", alpha=0.6, label="Random Guess (AUC = 0.50)")

    colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd"]
    for i, (m_name, m_info) in enumerate(models_roc_data.items()):
        fpr = m_info["fpr"]
        tpr = m_info["tpr"]
        auc = m_info["roc_auc"]
        color = colors[i % len(colors)]
        ax.plot(fpr, tpr, color=color, lw=2, label=f"{m_name} (AUC = {auc:.4f})")

    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.05])
    ax.set_xlabel("False Positive Rate (1 - Specificity)", fontsize=11, labelpad=8)
    ax.set_ylabel("True Positive Rate (Recall / Sensitivity)", fontsize=11, labelpad=8)
    ax.set_title("Receiver Operating Characteristic (ROC) Comparison", fontsize=12, fontweight="bold", pad=12)
    ax.legend(loc="lower right", frameon=True, fontsize=9)
    ax.grid(alpha=0.3, linestyle=":")

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches="tight")
    plt.close()


def plot_model_comparison_bars(
    models_metrics: List[Dict[str, Any]],
    output_path: Union[str, Path],
) -> None:
    """Plots side-by-side bar comparison of evaluated models."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    names = [m["model_name"] for m in models_metrics]
    accuracies = [m["accuracy"] * 100 for m in models_metrics]
    f1s = [m["f1_score"] * 100 for m in models_metrics]
    aucs = [m["roc_auc"] * 100 for m in models_metrics]
    fprs = [m["false_positive_rate"] * 100 for m in models_metrics]

    x = np.arange(len(names))
    width = 0.2

    fig, ax = plt.subplots(figsize=(9, 5), dpi=150)
    ax.bar(x - 1.5 * width, accuracies, width, label="Accuracy (%)", color="#2563eb")
    ax.bar(x - 0.5 * width, f1s, width, label="F1 Score (%)", color="#10b981")
    ax.bar(x + 0.5 * width, aucs, width, label="ROC-AUC (%)", color="#8b5cf6")
    ax.bar(x + 1.5 * width, fprs, width, label="False Pos Rate (%)", color="#ef4444")

    ax.set_ylabel("Percentage (%)", fontsize=11)
    ax.set_title("Model Benchmark Comparison on Test Set", fontsize=12, fontweight="bold", pad=12)
    ax.set_xticks(x)
    ax.set_xticklabels(names, fontsize=10, rotation=15, ha="right")
    ax.set_ylim([0, 105])
    ax.legend(loc="upper right", frameon=True)
    ax.grid(axis="y", alpha=0.3, linestyle=":")

    plt.tight_layout()
    plt.savefig(output_path, bbox_inches="tight")
    plt.close()
