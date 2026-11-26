# PhishGuard AI Dataset Guide

This directory holds the training and evaluation datasets for the PhishGuard AI phishing email detection model.

---

## ⚠️ Important Note Regarding Model Metrics
As per strict engineering guidelines:
- **`sample_emails.csv` is ONLY a tiny (~40 rows) diagnostic sample for unit tests and local pipeline verification.**
- **It MUST NEVER be used for training production models or reporting evaluation metrics (Accuracy, ROC-AUC, Confusion Matrix).**
- All production evaluation metrics reported in the UI and documentation must come from training on a genuine, comprehensive public dataset.

---

## Where to Place Datasets

Place your downloaded CSV dataset(s) into this directory:
```
/ml/data/
├── README.md
├── sample_emails.csv                <-- Test sample only (~40 rows)
├── phishing_emails.csv              <-- (Recommended) Full dataset
└── custom_corpus.csv                <-- (Optional) Any additional merged corpora
```

---

## Recommended Public Datasets

You can use any of the following standard industry datasets:

1. **Kaggle Phishing Email Dataset** (e.g., Subhajit Nayak / Mendeley Phishing Data)
   - Typically contains 18,000+ legitimate and phishing emails.
   - [Kaggle: Phishing Email Dataset](https://www.kaggle.com/datasets/subhajitnayak/phishing-emails)
2. **Nazario Phishing Corpus**
   - High-quality, real-world archive of captured phishing attacks and lures.
   - [Monkey.org Jose Nazario Phishing Corpus](https://monkey.org/~jose/phishing/)
3. **Enron Email Corpus** (Legitimate Mail Benchmark)
   - Standard baseline for benign enterprise email communication.
   - [CMU Enron Email Dataset](https://www.cs.cmu.edu/~enron/)
4. **SpamAssassin Public Corpus**
   - Labeled corpus of ham and spam/phishing emails with RFC822 headers.
   - [Apache SpamAssassin Public Corpus](https://spamassassin.apache.org/old/publiccorpus/)

---

## Expected CSV Schema

`data_loader.py` automatically normalizes common column naming conventions, but standardizes on:

| Column | Type | Description |
| :--- | :--- | :--- |
| `text` | `string` | The email subject and/or body (HTML or plain text). Also accepts `Email Text`, `body`, `message`. |
| `label` | `int` | `1` = Phishing / Malicious, `0` = Safe / Legitimate. Also accepts `Email Type`, `class`, `spam` (`Phishing Email`/`Safe Email`). |

### Merging Multiple CSVs
`data_loader.py` supports passing a list of filepaths to `load_dataset(['dataset1.csv', 'dataset2.csv'])` to seamlessly merge, deduplicate, and clean multiple sources into one unified DataFrame.
