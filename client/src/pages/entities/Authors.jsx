import { FiUsers } from "react-icons/fi";
import EntityListPage from "./EntityListPage";

export default function Authors() {
  return (
    <EntityListPage
      apiPath="/authors"
      entityLabel="المؤلف"
      sectionLabel="تسجيل المؤلفين"
      icon={FiUsers}
    />
  );
}
