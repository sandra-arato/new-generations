import os
from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel
from textgenrnn import textgenrnn

# Load environment variables from .env
load_dotenv()

WEIGHTS_PATH = os.getenv('WEIGHTS_PATH')
VOCAB_PATH = os.getenv('VOCAB_PATH', './model_weights/textgenrnn_vocab.json')
CONFIG_PATH = os.getenv('CONFIG_PATH', './model_weights/textgenrnn_config.json')

app = FastAPI()
textgen = textgenrnn(
    weights_path=WEIGHTS_PATH,
    vocab_path=VOCAB_PATH,
    config_path=CONFIG_PATH
)

class GenerateRequest(BaseModel):
    prefix: str = ""
    temperature: float = 0.5
    n: int = 1

@app.post("/generate")
def generate_text(req: GenerateRequest):
    results = textgen.generate(
        n=req.n,
        prefix=req.prefix,
        temperature=req.temperature,
        return_as_list=True
    )
    return {"results": results} 