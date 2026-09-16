// Markpad Native — Sample Rust File
// Publisher: Vodiy

use std::fs;
use std::path::Path;

pub struct TextBuffer {
    pub file_path: Option<String>,
    pub content: String,
    pub line_ending: String,
}

impl TextBuffer {
    pub fn new(content: String) -> Self {
        let line_ending = if content.contains("\r\n") {
            "CRLF".to_string()
        } else {
            "LF".to_string()
        };

        Self {
            file_path: None,
            content,
            line_ending,
        }
    }

    pub fn line_count(&self) -> usize {
        self.content.lines().count()
    }

    pub fn word_count(&self) -> usize {
        self.content.split_whitespace().count()
    }
}

pub fn main() {
    let buffer = TextBuffer::new("Hello Markpad Native!\nPublished by Vodiy.".to_string());
    println!("Lines: {}, Words: {}", buffer.line_count(), buffer.word_count());
}
