import BulkPhotoUploadForm from "@/features/photo-portfolio/components/BulkPhotoUploadForm";
import { getPhotoLocations } from "@/features/photo-portfolio/data/admin";

export default async function BulkPhotoPage() {
  return <BulkPhotoUploadForm locations={await getPhotoLocations()} />;
}
