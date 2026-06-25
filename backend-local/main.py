from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}
    

@app.get("/api/analyze")
def analyze():
    return {"Hello": "World"}
    

@app.get("/api/explain")
def explain():
    return {"Hello": "World"}
    