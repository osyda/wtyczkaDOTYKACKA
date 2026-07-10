import { getMenu } from "@/lib/dotykacka/menu";
import { Shop } from "@/components/Shop";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const menu = await getMenu();
  return <Shop menu={menu} />;
}
