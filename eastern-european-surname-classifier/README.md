# Eastern European Surname Classifier

A machine learning classifier that determines whether a surname is Eastern European (specifically South Slavic) based on linguistic features. The model is trained on surnames from Croatia, Slovenia, Serbia, Bosnia-Herzegovina, and Montenegro, versus a balanced set of non-Eastern European surnames.

## Features

- **Binary Classification**: Predicts whether a surname is Eastern European (1) or not (0).
- **ASCII-Normalized Pipeline**: Handles real-world input by normalizing all names to ASCII (e.g., "Kovačević" → "kovacevic") before processing.
- **Robust Feature Engineering**:
  - Character n-grams (bigrams and trigrams) to capture linguistic patterns.
  - Phonetic encoding (Soundex) to capture sound patterns.
  - Structural features (length, vowel count, first/last letters).
- **Random Forest Model**: Uses scikit-learn's `RandomForestClassifier` with probability outputs.
- **Interactive Interface**: Includes a command-line tool for real-time testing.

## Installation

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

## Quick Start

### 1. Interactive Mode
Run the interactive classifier to type in names and see results immediately:
```bash
python interactive_classifier.py
```

### 2. Training the Model
To retrain the model from scratch (dataset creation + training):
```bash
# Step 1: Create a balanced binary dataset
python create_binary_dataset.py

# Step 2: Train the model
python eastern_european_surname_classifier.py
```

### 3. Example Script
Run a batch of example predictions:
```bash
python example_usage.py
```

## Usage in Code

```python
from eastern_european_surname_classifier import EasternEuropeanSurnameClassifier

# Load the trained model
classifier = EasternEuropeanSurnameClassifier()
classifier.load_model("eastern_european_surname_model.pkl")

# Predict a single surname
# Returns: (probability, is_eastern_european)
probability, is_ee = classifier.predict_eastern_european("Kovačević")

print(f"Probability: {probability:.3f}")
print(f"Is Eastern European: {is_ee}")
```

## Data & Features

### Dataset
The project uses a custom dataset construction:
- **Positive Class**: Common surnames from Croatia, Slovenia, Serbia, Bosnia-Herzegovina, and Montenegro.
- **Negative Class**: A diverse set of common non-Eastern European surnames (English, Spanish, German, etc.) to ensure robust binary classification.

### Feature Engineering
The model relies on features that survive ASCII normalization, making it robust to inputs without diacritics:
1. **N-grams**: Character bigrams and trigrams (e.g., "vic", "ov") vectorized using CountVectorizer.
2. **Phonetic**: Soundex encoding to group names by pronunciation.
3. **Structural**: Length, vowel count, first and last letters.

**Note**: Diacritic-specific features (like counting 'č' or 'ć') are intentionally excluded to ensure the model works on standard ASCII keyboards.

## Model Performance

The model typically achieves high performance metrics on the test set:
- **ROC-AUC**: ~0.99
- **Accuracy**: >96%
- **Precision/Recall**: High precision for the Eastern European class.

**Threshold**: A probability threshold of **0.30** is used by default to classify a name as Eastern European

## Project Structure

- `eastern_european_surname_classifier.py`: Main class implementation and training logic.
- `interactive_classifier.py`: CLI tool for testing.
- `create_binary_dataset.py`: Script to generate the balanced training dataset.
- `example_usage.py`: Demonstration script.
- `names_files/`: Directory containing the raw and processed CSV datasets.
- `eastern_european_surname_model.pkl`: Serialized trained model.

## License

This project is for educational and research purposes.
