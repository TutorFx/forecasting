from fastapi import FastAPI
from models.generated.prophet_input import ForecastInput

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Prophet Service Running"}

@app.post("/predict")
def predict(data: ForecastInput):
    return {"received": data}