import subprocess
import os
from pathlib import Path

def main():
    input_path = Path("../../contracts/schemas")
    output_path = Path("models/generated")
    output_path.mkdir(parents=True, exist_ok=True)
    
    subprocess.run([
        "datamodel-codegen",
        "--input", str(input_path),
        "--output", str(output_path),
        "--input-file-type", "jsonschema",
        "--output-model-type", "pydantic_v2.BaseModel"
    ], check=True)

if __name__ == "__main__":
    main()