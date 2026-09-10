# Admin

The staff site: editing the content customers see. Core entity vocabulary is in `apps/api/CONTEXT.md`.

## Language

**CMS**:
The content-management area of the admin site: Service Packages, Branch info (including the Walk-in flag), and package cover images. Changes here appear on the landing site without a deploy.
_Avoid_: settings, config

**Deactivate**:
The catalog action of hiding a Service Package from the landing site. Deliberately not "delete" — the package stays in the data model.
_Avoid_: delete, remove, archive
