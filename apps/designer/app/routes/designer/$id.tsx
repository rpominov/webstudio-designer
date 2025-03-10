import { useLoaderData } from "@remix-run/react";
import path from "path";
import {
  ActionFunction,
  LoaderFunction,
  unstable_createFileUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/node";
import type { Project, Asset } from "@webstudio-is/react-sdk";
import { Designer, links } from "~/designer";
import * as db from "~/shared/db";
import config from "~/config";
import env from "~/env.server";
import { ImagesUpload } from "~/designer/features/sidebar-left/types";

export { links };

export const loader: LoaderFunction = async ({ params }) => {
  if (params.id === undefined) throw new Error("Project id undefined");
  const project = await db.project.loadById(params.id);
  const assets = await db.assets.loadByProject(params.id);
  if (project === null) {
    return { errors: `Project "${params.id}" not found` };
  }
  return { config, assets, project, env };
};

type Data = {
  config: typeof config;
  project: Project;
  assets: Asset[];
};

type Error = {
  errors: "string";
};

export const action: ActionFunction = async ({ request, params }) => {
  if (params.id === undefined) throw new Error("Project id undefined");

  const uploads = path.join(__dirname, "../public");
  const folderInPublic =
    process.env.FILE_UPLOAD_PATH || config.defaultUploadPath;
  const directory = path.join(uploads, folderInPublic);

  try {
    const formData = await unstable_parseMultipartFormData(
      request,
      unstable_createFileUploadHandler({
        maxPartSize: 10_000_000,
        directory,
        file: ({ filename }) => filename,
      })
    );

    const imagesInfo = ImagesUpload.parse(formData.getAll("image"));
    imagesInfo.forEach((image) => {
      const data = {
        type: image.type,
        name: image.name,
        path: `${path.join("/", folderInPublic, image.name)}`,
      };
      const projectId = params.id as string;
      db.assets.create(projectId, data);
    });

    return {
      ok: true,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        errors: error.message,
      };
    }
  }
};

const DesignerRoute = () => {
  const data = useLoaderData<Data | Error>();
  if ("errors" in data) {
    return <p>{data.errors}</p>;
  }
  return <Designer {...data} />;
};

export default DesignerRoute;
