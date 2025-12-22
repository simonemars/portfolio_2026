# Eastern European Surname Classifier

A machine learning classifier that determines whether a surname is Eastern European based on linguistic features. The model is trained on surnames from Croatia, Slovenia, Serbia, Bosnia-Herzegovina, and Montenegro.

## Features

- **Binary Classification**: Predicts whether a surname is Eastern European (1) or not (0)
- **Linguistic Feature Extraction**: Analyzes character patterns, diacritics, and n-grams
- **Random Forest Model**: Uses scikit-learn's RandomForestClassifier with probability outputs
- **Custom Threshold**: Configurable classification threshold (default: 0.30)
- **Easy-to-Use API**: Simple function interface for predictions

## Installation

1. Install the required dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Training the Model

```python
from eastern_european_surname_classifier import EasternEuropeanSurnameClassifier

# Initialize classifier with custom threshold
classifier = EasternEuropeanSurnameClassifier(threshold=0.30)

# Train the model
X_test, y_test = classifier.train("names_files/south_slavic_surnames_features.csv")

# Save the trained model
classifier.save_model("eastern_european_surname_model.pkl")
```

### Making Predictions

```python
# Load a trained model
classifier = EasternEuropeanSurnameClassifier()
classifier.load_model("eastern_european_surname_model.pkl")

# Predict a single surname
probability, is_eastern_european = classifier.predict_eastern_european("Kovačević")
print(f"Probability: {probability:.3f}")
print(f"Is Eastern European: {is_eastern_european}")
```

### Using the Reusable Function

```python
def predict_eastern_european(name: str) -> tuple[float, bool]:
    """
    Reusable function to predict if a surname is Eastern European.
    
    Args:
        name (str): The surname to classify
        
    Returns:
        tuple[float, bool]: (probability, is_eastern_european)
    """
    classifier = EasternEuropeanSurnameClassifier()
    classifier.load_model("eastern_european_surname_model.pkl")
    return classifier.predict_eastern_european(name)

# Example usage
prob, is_ee = predict_eastern_european("Petrović")
print(f"Petrović: {prob:.3f} -> {'Eastern European' if is_ee else 'Not Eastern European'}")
```

## Data Format

The classifier expects a CSV file with the following columns:

- `surname`: The surname string
- `length`: Total character count
- `vowel_count`: Count of vowels (A/E/I/O/U)
- `diacritic_count`: Count of diacritics (č/ć/š/đ/ž)
- `first_letter`: First character of the surname
- `last_letter`: Last character of the surname
- `country_code`: Numeric code (0-4 for Eastern European countries)

## Feature Engineering

The classifier extracts and uses the following features:

1. **Basic Features**:
   - Surname length
   - Vowel count
   - Diacritic count
   - First and last letters

2. **Categorical Features**:
   - One-hot encoded first and last letters

3. **N-gram Features**:
   - Character bigrams and trigrams
   - TF-IDF vectorization

4. **Preprocessing**:
   - Standard scaling for numeric features
   - One-hot encoding for categorical features
   - Count vectorization for n-grams

## Model Performance

The Random Forest classifier is evaluated using:

- **ROC-AUC**: Area under the ROC curve
- **Accuracy**: Overall classification accuracy
- **Precision**: True positives / (True positives + False positives)
- **Recall**: True positives / (True positives + False negatives)

## Classification Threshold

The model uses a **0.30 threshold** for classification:
- Probability ≥ 0.30: Classified as Eastern European
- Probability < 0.30: Classified as NOT Eastern European

This threshold can be adjusted based on your specific needs for precision vs. recall.

## Example Output

```
Loading and preparing data...
Training set size: 395
Test set size: 99
Eastern European surnames in training set: 395/395 (100.0%)

Training model...

Evaluating model...
ROC-AUC: 0.987
Accuracy: 0.970
Precision: 0.970
Recall: 1.000
Threshold: 0.3

PREDICTION EXAMPLES
==================================================
Kovačević      -> 0.987 -> EASTERN EUROPEAN
Novak          -> 0.923 -> EASTERN EUROPEAN
Jovanović      -> 0.998 -> EASTERN EUROPEAN
Smith          -> 0.012 -> NOT Eastern European
Garcia         -> 0.045 -> NOT Eastern European
```

## Files

- `eastern_european_surname_classifier.py`: Main classifier implementation
- `example_usage.py`: Example usage script
- `requirements.txt`: Python dependencies
- `names_files/south_slavic_surnames_features.csv`: Training data
- `eastern_european_surname_model.pkl`: Trained model (generated after training)

## Running the Examples

1. **Train and test the model**:
```bash
python eastern_european_surname_classifier.py
```

2. **Use the example script**:
```bash
python example_usage.py
```

## Notes

- The model is specifically trained on South Slavic surnames (Croatian, Slovenian, Serbian, Bosnian, Montenegrin)
- It may not generalize well to other Eastern European regions (e.g., Polish, Hungarian, Romanian)
- The 0.30 threshold is optimized for this specific dataset
- Character n-grams help capture linguistic patterns specific to South Slavic languages

## License

This project is for educational and research purposes. 