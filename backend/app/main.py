from fastapi import FastAPI

app = FastAPI(title="Tienda Virtual UTB", version="0.1.0")


@app.get("/health", tags=["operacion"])
def health() -> dict[str, str]:
    """Confirma que el proceso de la API está disponible."""
    return {"status": "ok"}
