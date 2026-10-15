# Scrub Data — Automated CSV & Tabular Data Cleaning Pipeline

An automated data cleaning web application and pipeline built with Node.js, Express, AWS S3, AWS Glue, and SendGrid. Users upload raw CSV datasets to S3, trigger automated statistical imputation and schema normalization jobs, and receive a signed download link once cleaning completes.

## Features
- **S3 Upload & Presigned Delivery**: Streams uploaded CSV files to AWS S3 (`raw-input/` prefix) and generates time-limited download links from `cleaned-output/`.
- **Deterministic Tabular Cleaning Engine (`services/csvCleaner.js`)**:
  - Median/mode missing-value imputation per column
  - Currency & numeric string coercion
  - Exact and key-based duplicate row deduplication
  - Z-score outlier detection and winsorization/filtering
- **Asynchronous Job Polling & Notification**: Tracks long-running AWS Glue ETL runs and dispatches completion emails via SendGrid.

## Quick Start
```bash
npm install
npm test
npm start
```