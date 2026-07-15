from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.interview import router as interview_router
from routers.report import router as report_router

app = FastAPI(title="AI Interview Coach API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(interview_router, prefix="/api/interview")
app.include_router(report_router, prefix="/api/report")


@app.get("/")
async def root():
    return {"message": "AI Interview Coach API is running"}
