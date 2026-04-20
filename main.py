from src.main import app
 
if __name__ == "__main__":
    import os
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host="localhost", port=port)