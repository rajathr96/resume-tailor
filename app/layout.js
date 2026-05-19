import './globals.css';

export const metadata = {
  title: 'Resume Tailor',
  description: 'AI-powered PM resume tailoring with ATS scoring',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
