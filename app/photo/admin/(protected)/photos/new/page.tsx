import UploadPhotoForm from "@/features/photo-portfolio/components/UploadPhotoForm";
import { getPhotoLocations } from "@/features/photo-portfolio/data/admin";

export default async function NewPhotoPage() {
  return <UploadPhotoForm locations={await getPhotoLocations()} />;
}
