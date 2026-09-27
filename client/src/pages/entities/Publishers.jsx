import { FiHome } from "react-icons/fi";
import EntityListPage from "./EntityListPage";

export default function Publishers() {
  return (
    <EntityListPage
      apiPath="/publishers"
      entityLabel="دار النشر"
      sectionLabel="تسجيل دور النشر"
      icon={FiHome}
    />
  );
}
