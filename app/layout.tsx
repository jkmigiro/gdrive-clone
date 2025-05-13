import "./globals.css";
import { Providers } from "./components/Providers";
export const metadata = {
  title: "Google Drive Clone",
  description: "A simplified Google Drive clone",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

// const App = () => {
//   return (
//     <RPConfig>
//       <RPProvider src="https://cdn.codewithmosh.com/image/upload/v1721763853/guides/web-roadmap.pdf">
//         <RPDefaultLayout style={{ height: '660px' }}>
//           <RPPages />
//             <Providers>{children}</Providers>
//         </RPDefaultLayout>
//       </RPProvider>
//     </RPConfig>
//   )
// }
