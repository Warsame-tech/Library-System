import { FiTag } from "react-icons/fi";
import EntityListPage from "./EntityListPage";

export default function Arts() {
  return (
    <EntityListPage
      apiPath="/arts"
      entityLabel="الفن"
      sectionLabel="تسجيل الفنون"
      icon={FiTag}
    />
  );
}
