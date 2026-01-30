from scripts.codegen_proto import generate_proto
from scripts.codegen_pydantic import generate_pydantic


def main():
  generate_pydantic()
  generate_proto()


if __name__ == "__main__":
  main()
