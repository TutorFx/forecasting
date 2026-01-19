import subprocess
from pathlib import Path

def generate_proto():
    input_path = Path("../../core/schemas").resolve()
    output_path = Path("models/generated/proto")
    output_path.mkdir(parents=True, exist_ok=True)
    
    json_files = list(input_path.glob("*.json"))
    
    for json_file in json_files:
        output_file = output_path / f"{json_file.stem}.proto"
        message_name = json_file.stem
        
        try:
            result = subprocess.run([
                "npx", "-y", "jsonschema-protobuf", str(json_file)
            ], capture_output=True, text=True, check=True)
            
            content = result.stdout

            with open(output_file, "w") as f:
                f.write(content)

        except subprocess.CalledProcessError as e:
            print(f"  [X] Erro ao processar {json_file.name}: {e.stderr}")
        except Exception as e:
            print(f"  [X] Erro inesperado: {e}")

if __name__ == "__main__":
    generate_proto()