import gdown
import os

os.makedirs("data", exist_ok=True)

# Download processed.csv
gdown.download(
    "https://drive.google.com/uc?id=1VeZp-a9vXrQktZBg_HJa12qWc2zRQXO8",
    "data/processed.csv",
    quiet=False
)

# Download news_embiddings
gdown.download(
    "https://drive.google.com/uc?id=1-LYpQnDzsIgv2LWVLw4-cvgzJaj8BwEM",
    "data/news_embiddings",
    quiet=False
)