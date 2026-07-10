import { redirect } from "next/navigation";

// Główny adres = sklep dla klientów. Strona diagnostyczna: /status
export default function Home() {
  redirect("/menu");
}
