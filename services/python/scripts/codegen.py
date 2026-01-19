from scripts.codegen_pydantic import generate_pydantic
from scripts.codegen_proto import generate_proto

def main():
  generate_pydantic()
  generate_proto()

if __name__ == "__main__":
    main()