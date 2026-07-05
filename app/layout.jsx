import "./globals.css";

export const metadata = {
  title: "Vocab Memo",
  description: "A beginner-friendly vocabulary flashcard app"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
