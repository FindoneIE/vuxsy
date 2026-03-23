import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";

export async function deleteListing(id: string) {
  await deleteDoc(doc(db, "listings", id));
  return true;
}
