"""
Markpad Native — Sample Python Utility Script
Author: Vodiy Engineering Team
"""

import sys
import json
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Document:
    title: str
    extension: str
    line_count: int
    is_modified: bool = False

    def get_summary(self) -> str:
        status = "Modified" if self.is_modified else "Clean"
        return f"[{self.extension.upper()}] {self.title} ({self.line_count} lines) - {status}"

class DocumentManager:
    def __init__(self, publisher: str = "Vodiy"):
        self.publisher = publisher
        self.documents: List[Document] = []

    def add_document(self, title: str, extension: str, lines: int) -> Document:
        doc = Document(title=title, extension=extension, line_count=lines)
        self.documents.append(doc)
        print(f"Added: {doc.get_summary()}")
        return doc

def main():
    print(f"Initializing Markpad Manager by {DocumentManager().publisher}...")
    mgr = DocumentManager()
    mgr.add_document("README.md", "md", 120)
    mgr.add_document("config.json", "json", 45)
    mgr.add_document("dataset.csv", "csv", 1500)

if __name__ == "__main__":
    main()
