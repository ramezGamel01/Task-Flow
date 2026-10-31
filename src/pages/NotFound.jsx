import { Link } from "react-router";
import { Orbit } from "lucide-react";
import { useI18n } from "../i18n/I18n.jsx";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="page not-found">
      <div className="nf-art" aria-hidden="true">
        <span className="nf-ring" />
        <span className="nf-planet" />
        <Orbit size={40} />
      </div>
      <h1>{t("nf.title")}</h1>
      <p className="lead">{t("nf.body")}</p>
      <Link to="/" className="btn btn-primary" viewTransition>
        {t("nf.home")}
      </Link>
    </div>
  );
}
