import os
from dotenv import load_dotenv
from textgenrnn import textgenrnn

# Load environment variables from .env
load_dotenv()

SAMPLES_PATH = os.getenv('SAMPLES_PATH')

textgen = textgenrnn()
textgen.train_from_file(
    SAMPLES_PATH,
    num_epochs=10,                # You can increase for better results
    new_model=True,               # Train a new model from scratch
    word_level=False              # Set to True if you want word-level, but char-level is default
)
textgen.save('model_weights/ausztraliabamentem.hdf5')