import subprocess
from pathlib import Path

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

from scripts.codegen import main as run_codegen


class ReloadHandler(FileSystemEventHandler):
  def on_modified(self, event: FileSystemEvent) -> None:
    if event.src_path.endswith(".json"):
      print(f" JSON alterado: {event.src_path}. Atualizando modelos...")
      try:
        run_codegen()
      except Exception as e:
        print(f" Erro no codegen: {e}")


def main() -> None:
  print("Gerando modelos iniciais...")
  run_codegen()

  schema_path = Path("../../core/schemas").resolve()
  event_handler = ReloadHandler()
  observer = Observer()
  observer.schedule(event_handler, str(schema_path), recursive=False)
  observer.start()

  print(f" Monitorando {schema_path}")

  try:
    subprocess.run(["uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"])
  except KeyboardInterrupt:
    observer.stop()

  observer.join()


if __name__ == "__main__":
  main()
