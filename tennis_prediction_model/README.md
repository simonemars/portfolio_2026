# Tennis Match Predictor

This project predicts the outcome of professional tennis matches using historical data and machine learning.

## Algorithm

The system uses a *Random Forest Classifier The model makes predictions based on:
- Player Elo ratings (dynamic ratings that update after every match)
- Surface-specific performance (Hard, Clay, Grass, Carpet)
- Player physical attributes (Height, Weight, Handedness)
- Historical match statistics

## Prerequisites

- Python 3.x
- pandas
- scikit-learn
- flask
- numpy
- joblib

## Usage

### 1. Data Preparation
Calculate historical Elo ratings for all players:
```bash
python elo_calculator.py
```
This processes the match database and generates `final_elo_ratings_all_years.csv`.

### 2. Model Training
Train the Random Forest model and validate accuracy:
```bash
python match_predictor.py
```
This script trains the model on recent data and saves it to `match_predictor.joblib`.

### 3. Web Interface
Start the web application to predict matches via a graphical interface:
```bash
python app.py
```
Then open your browser to `http://localhost:8080`.

### 4. Command Line Predictions
Predict matches from a CSV file:
```bash
python predict_new_matches.py input_matches.csv
```

