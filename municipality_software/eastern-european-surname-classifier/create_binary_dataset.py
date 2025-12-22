"""
Create Binary Dataset for Eastern European Surname Classification

This script creates a balanced dataset with both Eastern European and non-Eastern European
surnames for proper binary classification training.
"""

import pandas as pd
import numpy as np
import re

def extract_features(surname: str) -> dict:
    """Extract features from a surname."""
    surname_lower = surname.lower()
    
    features = {
        'surname': surname_lower,
        'length': len(surname),
        'vowel_count': sum(1 for char in surname_lower if char in 'aeiou'),
        'diacritic_count': sum(1 for char in surname_lower if char in 'čćšđž'),
        'first_letter': surname_lower[0] if surname_lower else '',
        'last_letter': surname_lower[-1] if surname_lower else ''
    }
    
    return features

def create_binary_dataset():
    """Create a balanced binary dataset for surname classification."""
    
    # Load the original Eastern European surnames
    df_ee = pd.read_csv("names_files/south_slavic_surnames_features.csv")
    
    # Create non-Eastern European surnames (common surnames from other regions)
    non_ee_surnames = [
        # English surnames
        "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
        "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
        "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
        "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker",
        "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
        "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell",
        "Carter", "Roberts", "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker",
        "Cruz", "Edwards", "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy",
        "Cook", "Rogers", "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson", "Bailey",
        "Reed", "Kelly", "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson", "Watson",
        "Brooks", "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza", "Ruiz", "Hughes",
        "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers", "Long", "Ross", "Foster",
        "Jimenez", "Powell", "Jenkins", "Perry", "Russell", "Sullivan", "Bell", "Coleman",
        "Butler", "Henderson", "Barnes", "Gonzales", "Fisher", "Vasquez", "Simmons", "Romero",
        "Jordan", "Patterson", "Alexander", "Hamilton", "Graham", "Reynolds", "Griffin", "Wallace",
        "Moreno", "West", "Cole", "Hayes", "Bryant", "Herrera", "Gibson", "Ellis", "Tran",
        "Medina", "Aguilar", "Stevens", "Murray", "Ford", "Castro", "Marshall", "Owens",
        "Harrison", "Fernandez", "Mcdonald", "Woods", "Washington", "Kennedy", "Wells",
        "Vargas", "Henry", "Chen", "Freeman", "Webb", "Tucker", "Guzman", "Burns", "Crawford",
        "Olson", "Simpson", "Porter", "Hunter", "Gordon", "Mendez", "Silva", "Shaw", "Snyder",
        "Mason", "Dixon", "Munoz", "Hunt", "Hicks", "Holmes", "Palmer", "Wagner", "Black",
        "Robertson", "Boyd", "Rose", "Stone", "Salazar", "Fox", "Warren", "Mills", "Meyer",
        "Rice", "Schmidt", "Garza", "Daniels", "Ferguson", "Nichols", "Stephens", "Soto",
        "Weaver", "Ryan", "Gardner", "Payne", "Grant", "Dunn", "Kelley", "Spencer", "Hawkins",
        "Arnold", "Pierce", "Vazquez", "Hansen", "Peters", "Santos", "Hart", "Bradley",
        "Knight", "Elliott", "Cunningham", "Duncan", "Armstrong", "Hudson", "Carroll",
        "Lane", "Riley", "Andrews", "Alvarado", "Ray", "Delgado", "Berry", "Perkins",
        "Hoffman", "Johnston", "Matthews", "Pena", "Richards", "Contreras", "Willis",
        "Carpenter", "Lawrence", "Sandoval", "Guerrero", "George", "Chapman", "Rios",
        "Estrada", "Ortega", "Watkins", "Greene", "Nunez", "Wheeler", "Valdez", "Harper",
        "Burke", "Larson", "Santiago", "Maldonado", "Morrison", "Franklin", "Carlson",
        "Austin", "Dominguez", "Carr", "Lawson", "Jacobs", "Obrien", "Lynch", "Singh",
        "Vega", "Bishop", "Montgomery", "Oliver", "Jensen", "Harvey", "Williamson",
        "Gilbert", "Dean", "Sims", "Espinoza", "Howell", "Li", "Wong", "Reid", "Hanson",
        "Le", "Mccoy", "Garrett", "Burton", "Fuller", "Sanders", "Shaw", "Warren", "Dixon",
        "Hughes", "Graham", "Murray", "Freeman", "Wells", "Webb", "Simpson", "Stevens",
        "Tucker", "Porter", "Hunter", "Hicks", "Crawford", "Henry", "Boyd", "Mason",
        "Morales", "Kennedy", "Warren", "Dixon", "Ramos", "Reyes", "Burns", "Gordon",
        "Shaw", "Holmes", "Rice", "Robertson", "Hunt", "Black", "Daniels", "Palmer",
        "Mills", "Nichols", "Grant", "Knight", "Ferguson", "Rose", "Stone", "Hawkins",
        "Dunn", "Perkins", "Hudson", "Spencer", "Gardner", "Stephens", "Payne", "Pierce",
        "Berry", "Matthews", "Arnold", "Wagner", "Willis", "Ray", "Watkins", "Olson",
        "Carroll", "Duncan", "Snyder", "Hart", "Cunningham", "Bradley", "Lane", "Andrews",
        "Ruiz", "Harper", "Fox", "Riley", "Armstrong", "Carpenter", "Weaver", "Greene",
        "Lawrence", "Elliott", "Chavez", "Sims", "Austin", "Peters", "Kelley", "Franklin",
        "Lawson", "Fields", "Gutierrez", "Ryan", "Schmidt", "Carr", "Vasquez", "Castillo",
        "Wheeler", "Chapman", "Oliver", "Montgomery", "Richards", "Williamson", "Johnston",
        "Banks", "Meyer", "Bishop", "Mccoy", "Howell", "Alvarez", "Morrison", "Hansen",
        "Fernandez", "Garza", "Harvey", "Little", "Burton", "Stanley", "Nguyen", "George",
        "Jacobs", "Reid", "Kim", "Fuller", "Lynch", "Dean", "Gilbert", "Garrett", "Romero",
        "Welch", "Larson", "Frazier", "Burke", "Hanson", "Day", "Mendoza", "Moreno", "Bowman",
        "Medina", "Fowler", "Brewer", "Hoffman", "Carlson", "Silva", "Pearson", "Holland",
        "Douglas", "Fleming", "Jensen", "Vargas", "Byrd", "Davidson", "Hopkins", "May",
        "Terry", "Herrera", "Wade", "Soto", "Walters", "Curtis", "Neal", "Caldwell",
        "Lowe", "Jennings", "Barnett", "Graves", "Jimenez", "Horton", "Shelton", "Barrett",
        "Obrien", "Castro", "Sutton", "Gregory", "Mckinney", "Lucas", "Miles", "Craig",
        "Rodriquez", "Chambers", "Holt", "Lambert", "Fletcher", "Watts", "Bates", "Hale",
        "Rhodes", "Pena", "Beck", "Newman", "Haynes", "Mcdaniel", "Mendez", "Bush", "Vaughn",
        "Parks", "Dawson", "Santiago", "Norris", "Hardy", "Love", "Steele", "Curry", "Powers",
        "Schultz", "Barker", "Guzman", "Page", "Munoz", "Ball", "Keller", "Chandler",
        "Weber", "Leonard", "Walsh", "Lyons", "Ramsey", "Wolfe", "Schneider", "Mullins",
        "Benson", "Sharp", "Bowen", "Daniel", "Barber", "Cummings", "Hines", "Baldwin",
        "Griffith", "Valdez", "Hubbard", "Salazar", "Reeves", "Warner", "Stevenson",
        "Burgess", "Santos", "Tate", "Cross", "Garner", "Mann", "Mack", "Moss", "Thornton",
        "Dennis", "Mcgee", "Farmer", "Delgado", "Aguilar", "Vega", "Glover", "Manning",
        "Cohen", "Harmon", "Rodgers", "Robbins", "Newton", "Todd", "Blair", "Higgins",
        "Ingram", "Reese", "Cannon", "Strickland", "Townsend", "Potter", "Goodwin",
        "Walton", "Rowe", "Hampton", "Ortega", "Patton", "Swanson", "Joseph", "Francis",
        "Goodman", "Maldonado", "Yates", "Becker", "Erickson", "Hodges", "Rios", "Conner",
        "Adkins", "Webster", "Norman", "Malone", "Hammond", "Flowers", "Cobb", "Moody",
        "Quinn", "Blake", "Maxwell", "Pope", "Floyd", "Osborne", "Paul", "Mccarthy",
        "Guerrero", "Lindsey", "Estrada", "Sandoval", "Gibbs", "Tyler", "Gross", "Fitzgerald",
        "Stokes", "Doyle", "Sherman", "Saunders", "Wise", "Colon", "Gill", "Alvarado",
        "Greer", "Padilla", "Simon", "Waters", "Nunez", "Ballard", "Schwartz", "Mcbride",
        "Houston", "Christensen", "Klein", "Pratt", "Briggs", "Parsons", "Mclaughlin",
        "Zimmerman", "French", "Buchanan", "Moran", "Copeland", "Roy", "Pittman", "Brady",
        "Mccormick", "Holloway", "Brock", "Poole", "Frank", "Logan", "Owen", "Bass",
        "Marsh", "Drake", "Wong", "Jefferson", "Park", "Morton", "Abbott", "Sparks",
        "Patrick", "Norton", "Huff", "Clayton", "Massey", "Lloyd", "Figueroa", "Carson",
        "Bowers", "Roberson", "Barton", "Tran", "Lamb", "Harrington", "Casey", "Boone",
        "Cortez", "Clarke", "Mathis", "Singleton", "Wilkins", "Cain", "Bryan", "Underwood",
        "Hogan", "Mckenzie", "Collier", "Luna", "Phelps", "Mcguire", "Allison", "Bridges",
        "Wilkerson", "Nash", "Summers", "Atkins", "Wilcox", "Pitts", "Conley", "Marquez",
        "Burnett", "Richard", "Cochran", "Chase", "Davenport", "Hood", "Gates", "Clay",
        "Ayala", "Sawyer", "Roman", "Vazquez", "Dickerson", "Hodge", "Acosta", "Flynn",
        "Espinoza", "Nicholson", "Monroe", "Wolf", "Morrow", "Kirk", "Randall", "Anthony",
        "Whitaker", "Oconnor", "Skinner", "Ware", "Molina", "Kirby", "Huffman", "Bradford",
        "Charles", "Gilmore", "Dominguez", "Oneal", "Bruce", "Lang", "Combs", "Kramer",
        "Heath", "Hancock", "Gallagher", "Gaines", "Shaffer", "Short", "Wiggins", "Mathews",
        "Mcclain", "Fischer", "Wall", "Small", "Melton", "Hensley", "Bond", "Dyer",
        "Cameron", "Grimes", "Contreras", "Christian", "Wyatt", "Baxter", "Snow", "Mosley",
        "Shepherd", "Larsen", "Hoover", "Beasley", "Glenn", "Petersen", "Whitehead",
        "Meyers", "Keith", "Garrison", "Vincent", "Shields", "Horn", "Savage", "Olsen",
        "Schroeder", "Hartman", "Woodard", "Mueller", "Kemp", "Deleon", "Booth", "Patel",
        "Calhoun", "Wiley", "Eaton", "Cline", "Navarro", "Harrell", "Lester", "Humphrey",
        "Parrish", "Duran", "Hutchinson", "Hess", "Dorsey", "Bullock", "Robles", "Beard",
        "Dalton", "Avila", "Vance", "Rich", "Blackwell", "York", "Johns", "Blankenship",
        "Trevino", "Salinas", "Campos", "Pruitt", "Moses", "Callahan", "Golden", "Montoya",
        "Hardin", "Guerra", "Mcdowell", "Carey", "Stafford", "Gallegos", "Henson", "Wilkinson",
        "Booker", "Merritt", "Miranda", "Atkinson", "Orr", "Decker", "Hobbs", "Preston",
        "Tanner", "Knox", "Pacheco", "Stephenson", "Glass", "Rojas", "Serrano", "Marks",
        "Hickman", "English", "Sweeney", "Strong", "Prince", "Mcclure", "Conway", "Walter",
        "Roth", "Maynard", "Farrell", "Lowery", "Hurst", "Nixon", "Weiss", "Trujillo",
        "Ellison", "Sloan", "Juarez", "Winters", "Mclean", "Randolph", "Leon", "Boyer",
        "Villarreal", "Mccall", "Gentry", "Carrillo", "Kent", "Ayers", "Lara", "Shannon",
        "Sexton", "Pace", "Hull", "Leblanc", "Browning", "Velasquez", "Leach", "Chang",
        "House", "Sellers", "Herring", "Noble", "Foley", "Bartlett", "Mercado", "Landry",
        "Durham", "Walls", "Barr", "Mckee", "Bauer", "Rivers", "Everett", "Bradshaw",
        "Pugh", "Velez", "Rush", "Estes", "Dodson", "Morse", "Sheppard", "Weeks", "Camacho",
        "Bean", "Barron", "Livingston", "Middleton", "Spears", "Branch", "Blevins", "Chen",
        "Kerr", "Mcconnell", "Hatfield", "Harding", "Ashley", "Solis", "Herman", "Frost",
        "Giles", "Blackburn", "William", "Pennington", "Woodward", "Finley", "Mcintosh",
        "Koch", "Best", "Solomon", "Mccullough", "Dudley", "Nolan", "Blanchard", "Rivas",
        "Brennan", "Mejia", "Kane", "Benton", "Joyce", "Buckley", "Haley", "Valentine",
        "Maddox", "Russo", "Mcknight", "Buck", "Moon", "Mcmillan", "Crosby", "Berg",
        "Dotson", "Mays", "Roach", "Church", "Chan", "Richmond", "Meadows", "Faulkner",
        "Oneill", "Knapp", "Kline", "Barry", "Ochoa", "Jacobson", "Gay", "Avery", "Hendricks",
        "Horne", "Shepard", "Hebert", "Cherry", "Cardenas", "Mcintyre", "Whitney", "Waller",
        "Holman", "Donaldson", "Cantu", "Terrell", "Morin", "Gillespie", "Fuentes", "Tillman",
        "Sanford", "Bentley", "Peck", "Key", "Salas", "Rollins", "Gamble", "Dickson",
        "Battle", "Santana", "Cabrera", "Cervantes", "Howe", "Hinton", "Hurley", "Spence",
        "Zamora", "Yang", "Mcneil", "Suarez", "Case", "Petty", "Gould", "Mcfarland",
        "Sampson", "Carver", "Bray", "Rosario", "Macdonald", "Stout", "Hester", "Melendez",
        "Dillon", "Farley", "Hopper", "Galloway", "Potts", "Bernard", "Joyner", "Stein",
        "Aguirre", "Osborn", "Mercer", "Bender", "Franco", "Rowland", "Sykes", "Benjamin",
        "Travis", "Pickett", "Crane", "Sears", "Mayo", "Dunlap", "Hayden", "Wilder",
        "Mckay", "Coffey", "Mccarty", "Ewing", "Cooley", "Vaughan", "Bonner", "Cotton",
        "Holder", "Stark", "Ferrell", "Cantrell", "Fulton", "Lynn", "Lott", "Calderon",
        "Rosa", "Pollard", "Hooper", "Burch", "Mullen", "Fry", "Riddle", "Levy", "David",
        "Duke", "Odonnell", "Guy", "Michael", "Britt", "Frederick", "Daugherty", "Berger",
        "Dillard", "Alston", "Jarvis", "Frye", "Riggs", "Chaney", "Odom", "Duffy", "Fitzpatrick",
        "Valenzuela", "Merrill", "Mayer", "Alford", "Mcpherson", "Acevedo", "Donovan",
        "Barrera", "Albert", "Cote", "Reilly", "Compton", "Raymond", "Mooney", "Mcgowan",
        "Craft", "Cleveland", "Clemons", "Wynn", "Nielsen", "Baird", "Stanton", "Snider",
        "Rosales", "Bright", "Witt", "Stuart", "Hays", "Holden", "Rutledge", "Kinney",
        "Clements", "Castaneda", "Slater", "Hahn", "Emerson", "Conrad", "Burks", "Delaney",
        "Pate", "Lancaster", "Sweet", "Justice", "Tyson", "Sharpe", "Whitfield", "Talley",
        "Macias", "Irwin", "Burris", "Ratliff", "Mccray", "Madden", "Kaufman", "Beach",
        "Goff", "Cash", "Bolton", "Mcfadden", "Levine", "Good", "Byers", "Kirkland",
        "Kidd", "Workman", "Carney", "Dale", "Mcleod", "Holcomb", "England", "Finch",
        "Head", "Burt", "Hendrix", "Sosa", "Haney", "Franks", "Sargent", "Nieves", "Downs",
        "Rasmussen", "Bird", "Hewitt", "Lindsay", "Le", "Foreman", "Valencia", "Oneil",
        "Delacruz", "Vinson", "Hyde", "Forbes", "Gilliam", "Guthrie", "Wooten", "Huber",
        "Barlow", "Boyle", "Mcmahon", "Buckner", "Rocha", "Puckett", "Langley", "Knowles",
        "Cooke", "Velazquez", "Whitley", "Noel", "Vang"
    ]
    
    # Create features for non-Eastern European surnames
    non_ee_data = []
    for surname in non_ee_surnames:
        features = extract_features(surname)
        features['country'] = 'Non-Eastern European'
        features['rank'] = 0
        features['country_code'] = 5  # Use 5 for non-Eastern European
        non_ee_data.append(features)
    
    # Convert to DataFrame
    df_non_ee = pd.DataFrame(non_ee_data)
    
    # Combine datasets
    df_combined = pd.concat([df_ee, df_non_ee], ignore_index=True)
    
    # Shuffle the data
    df_combined = df_combined.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Save the combined dataset
    df_combined.to_csv("names_files/binary_surnames_dataset.csv", index=False)
    
    print(f"Created binary dataset with {len(df_ee)} Eastern European and {len(df_non_ee)} non-Eastern European surnames")
    print(f"Total dataset size: {len(df_combined)}")
    print(f"Eastern European percentage: {len(df_ee)/len(df_combined):.1%}")
    print(f"Non-Eastern European percentage: {len(df_non_ee)/len(df_combined):.1%}")
    
    return df_combined

if __name__ == "__main__":
    create_binary_dataset() 