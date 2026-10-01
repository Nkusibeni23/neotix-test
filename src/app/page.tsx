import { redirect } from "next/navigation";

// The signed-in shell sends visitors without a session on to /login.
export default function Home() {
  redirect("/requests");
}
