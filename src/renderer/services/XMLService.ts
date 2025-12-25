import {
  ProjectXML,
  Project,
  Metadata,
  OutCoordSys,
} from "../types/ProjectTypes";

/**
 * Parse XML string to ProjectXML object with type safety
 */
export function parseProjectXML(xmlString: string): ProjectXML {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  // Check for parsing errors
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    throw new Error(`XML parsing error: ${parserError.textContent}`);
  }

  const root = xmlDoc.documentElement;

  // Validate root element
  if (!root) {
    throw new Error("Invalid XML: No root element found");
  }

  if (root.tagName !== "rotgis") {
    throw new Error(`Invalid XML: Root element must be <rotgis>, found <${root.tagName}>`);
  }

  const projectElement = root.querySelector("project");
  if (!projectElement) {
    throw new Error("Invalid XML: <project> element not found");
  }

  const metadataElement = root.querySelector("metadata");
  if (!metadataElement) {
    throw new Error("Invalid XML: <metadata> element not found");
  }

  const projectData = parseProject(projectElement);
  const outcoordsysElement = projectElement.querySelector("outcoordsys");
  
  return {
    project: {
      ...projectData,
      outcoordsys: parseOutCoordSys(outcoordsysElement),
    },
    metadata: parseMetadata(metadataElement),
  };
}

/**
 * Convert ProjectXML object to XML string
 */
export function serializeProjectXML(project: ProjectXML): string {
  const xmlParts: string[] = ["<rotgis>"];

  // Project
  xmlParts.push("    <project>");
  xmlParts.push(`        <id>${escapeXML(project.project.id)}</id>`);
  xmlParts.push(
    `        <version>${escapeXML(project.project.version)}</version>`
  );
  xmlParts.push(`        <name>${escapeXML(project.project.name)}</name>`);
  xmlParts.push(`        <path>${escapeXML(project.project.path)}</path>`);
  xmlParts.push(
    `        <created>${escapeXML(project.project.created)}</created>`
  );
  if (project.project.projectFile) {
    xmlParts.push(`        <projectFile>${escapeXML(project.project.projectFile)}</projectFile>`);
  }

  // OutCoordSys (inside project)
  xmlParts.push("        <outcoordsys>");
  xmlParts.push("            <epsg>");
  xmlParts.push(`                <code>${project.project.outcoordsys.epsg.code}</code>`);
  xmlParts.push(
    `                <proj>${escapeXML(project.project.outcoordsys.epsg.proj)}</proj>`
  );
  xmlParts.push("            </epsg>");
  xmlParts.push("        </outcoordsys>");

  xmlParts.push("    </project>");

  // Metadata
  xmlParts.push("    <metadata>");
  project.metadata.mesh.forEach((mesh) => {
    xmlParts.push(serializeMesh(mesh, "        "));
  });
  project.metadata.pointCloud.forEach((pointCloud) => {
    xmlParts.push(serializePointCloud(pointCloud, "        "));
  });
  project.metadata.orthophoto.forEach((orthophoto) => {
    xmlParts.push(serializeOrthophoto(orthophoto, "        "));
  });
  xmlParts.push("        <dem>");
  project.metadata.dsm.forEach((dsm) => {
    xmlParts.push(serializeOrthophoto(dsm, "            ", "dsm"));
  });
  project.metadata.dtm.forEach((dtm) => {
    xmlParts.push(serializeOrthophoto(dtm, "            ", "dtm"));
  });
  xmlParts.push("        </dem>");
  xmlParts.push("    </metadata>");

  xmlParts.push("</rotgis>");

  return xmlParts.join("\n");
}

// Helper functions

function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getTextContent(
  element: Element | null,
  defaultValue: string = ""
): string {
  return element?.textContent?.trim() || defaultValue;
}

function getNumberContent(
  element: Element | null,
  defaultValue: number = 0
): number {
  const text = getTextContent(element);
  return text ? parseFloat(text) : defaultValue;
}

function getBooleanContent(
  element: Element | null,
  defaultValue: boolean = false
): boolean {
  const text = getTextContent(element);
  if (text === "true" || text === "1") return true;
  if (text === "false" || text === "0") return false;
  return defaultValue;
}

// Parser functions

function parseProject(element: Element | null): Project {
  if (!element) {
    throw new Error("parseProject: element is null");
  }
  const outcoordsysElement = element.querySelector("outcoordsys");
  const projectFile = getTextContent(element.querySelector("projectFile"));
  return {
    id: getTextContent(element.querySelector("id")),
    version: getTextContent(element.querySelector("version")),
    name: getTextContent(element.querySelector("name")),
    path: getTextContent(element.querySelector("path")),
    created: getTextContent(element.querySelector("created")),
    projectFile: projectFile || undefined,
    outcoordsys: parseOutCoordSys(outcoordsysElement),
  };
}

function parseMetadata(element: Element | null): Metadata {
  if (!element) {
    return {
      mesh: [],
      pointCloud: [],
      orthophoto: [],
      dsm: [],
      dtm: [],
    };
  }
  return {
    mesh: Array.from(element.querySelectorAll("mesh")).map((mesh) =>
      parseMesh(mesh)
    ),
    pointCloud: Array.from(element.querySelectorAll("pointCloud")).map(
      (pointCloud) => parsePointCloud(pointCloud)
    ),
    orthophoto: Array.from(element.querySelectorAll("orthophoto")).map(
      (orthophoto) => parseOrthophoto(orthophoto)
    ),
    dsm: Array.from(element.querySelectorAll("dsm")).map((dsm) =>
      parseOrthophoto(dsm)
    ),
    dtm: Array.from(element.querySelectorAll("dtm")).map((dtm) =>
      parseOrthophoto(dtm)
    ),
  };
}

function parseMesh(element: Element) {
  if (!element) {
    throw new Error("parseMesh: element is null");
  }
  return {
    id: getTextContent(element.querySelector("id")),
    name: getTextContent(element.querySelector("name")),
    fileType: "mesh" as const,
    extension: getTextContent(element.querySelector("extension")),
    asset: getTextContent(element.querySelector("asset")),
    bbox: parseBBox(element.querySelector("bbox")),
    center: parseCenter(element.querySelector("center")),
    epsg: getTextContent(element.querySelector("epsg")),
    epsgText: getTextContent(element.querySelector("epsgText")),
    proj4: getTextContent(element.querySelector("proj4")),
    path: getTextContent(element.querySelector("path")),
    import: getBooleanContent(element.querySelector("import")),
  };
}

function parsePointCloud(element: Element) {
  if (!element) {
    throw new Error("parsePointCloud: element is null");
  }
  return {
    id: getTextContent(element.querySelector("id")),
    name: getTextContent(element.querySelector("name")),
    fileType: "pc" as const,
    extension: getTextContent(element.querySelector("extension")),
    asset: getTextContent(element.querySelector("asset")),
    bbox: parseBBox(element.querySelector("bbox")),
    center: parseCenter(element.querySelector("center")),
    epsg: getTextContent(element.querySelector("epsg")),
    epsgText: getTextContent(element.querySelector("epsgText")),
    proj4: getTextContent(element.querySelector("proj4")),
    path: getTextContent(element.querySelector("path")),
    import: getBooleanContent(element.querySelector("import")),
    numberOfPoints: getNumberContent(element.querySelector("numberOfPoints")),
    dsm: {
      exist: getBooleanContent(element.querySelector("dsm > exist")),
      file: getTextContent(element.querySelector("dsm > file")),
      res: getNumberContent(element.querySelector("dsm > res")),
    },
  };
}

function parseOrthophoto(element: Element) {
  if (!element) {
    throw new Error("parseOrthophoto: element is null");
  }
  return {
    id: getTextContent(element.querySelector("id")),
    name: getTextContent(element.querySelector("name")),
    fileType: "orthophoto" as const,
    extension: getTextContent(element.querySelector("extension")),
    asset: getTextContent(element.querySelector("asset")),
    cog: getTextContent(element.querySelector("cog")),
    center: parseCenter(element.querySelector("center")),
    epsg: getTextContent(element.querySelector("epsg")),
    epsgText: getTextContent(element.querySelector("epsgText")),
    proj4: getTextContent(element.querySelector("proj4")),
    path: getTextContent(element.querySelector("path")),
    cogPath: getTextContent(element.querySelector("cogPath")),
    import: getBooleanContent(element.querySelector("import")),
  };
}

function parseBBox(element: Element | null) {
  if (!element) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
    };
  }
  return {
    min: {
      x: getNumberContent(element.querySelector("min > x")),
      y: getNumberContent(element.querySelector("min > y")),
      z: getNumberContent(element.querySelector("min > z")),
    },
    max: {
      x: getNumberContent(element.querySelector("max > x")),
      y: getNumberContent(element.querySelector("max > y")),
      z: getNumberContent(element.querySelector("max > z")),
    },
  };
}

function parseCenter(element: Element | null) {
  if (!element) {
    return { x: 0, y: 0 };
  }
  const centers = Array.from(element.querySelectorAll("center"));
  return {
    x: getNumberContent(centers[0]),
    y: getNumberContent(centers[1]),
  };
}

function parseOutCoordSys(element: Element | null): OutCoordSys {
  if (!element) {
    return {
      epsg: {
        code: 0,
        proj: "",
      },
    };
  }
  return {
    epsg: {
      code: getNumberContent(element.querySelector("epsg > code")),
      proj: getTextContent(element.querySelector("epsg > proj")),
    },
  };
}

// Serializer functions

function serializeMesh(mesh: any, indent: string): string {
  const parts: string[] = [];
  parts.push(`${indent}<mesh>`);
  parts.push(`${indent}    <id>${escapeXML(mesh.id)}</id>`);
  parts.push(`${indent}    <name>${escapeXML(mesh.name)}</name>`);
  parts.push(`${indent}    <fileType>${mesh.fileType}</fileType>`);
  parts.push(
    `${indent}    <extension>${escapeXML(mesh.extension)}</extension>`
  );
  parts.push(`${indent}    <asset>${escapeXML(mesh.asset)}</asset>`);
  parts.push(serializeBBox(mesh.bbox, `${indent}    `));
  parts.push(serializeCenter(mesh.center, `${indent}    `));
  parts.push(`${indent}    <epsg>${escapeXML(mesh.epsg)}</epsg>`);
  parts.push(`${indent}    <epsgText>${escapeXML(mesh.epsgText)}</epsgText>`);
  parts.push(`${indent}    <proj4>${escapeXML(mesh.proj4)}</proj4>`);
  parts.push(`${indent}    <path>${escapeXML(mesh.path)}</path>`);
  parts.push(`${indent}    <import>${mesh.import}</import>`);
  parts.push(`${indent}</mesh>`);
  return parts.join("\n");
}

function serializePointCloud(pc: any, indent: string): string {
  const parts: string[] = [];
  parts.push(`${indent}<pointCloud>`);
  parts.push(`${indent}    <id>${escapeXML(pc.id)}</id>`);
  parts.push(`${indent}    <name>${escapeXML(pc.name)}</name>`);
  parts.push(`${indent}    <fileType>${pc.fileType}</fileType>`);
  parts.push(`${indent}    <extension>${escapeXML(pc.extension)}</extension>`);
  parts.push(`${indent}    <asset>${escapeXML(pc.asset)}</asset>`);
  parts.push(serializeBBox(pc.bbox, `${indent}    `));
  parts.push(serializeCenter(pc.center, `${indent}    `));
  parts.push(`${indent}    <epsg>${escapeXML(pc.epsg)}</epsg>`);
  parts.push(`${indent}    <epsgText>${escapeXML(pc.epsgText)}</epsgText>`);
  parts.push(`${indent}    <proj4>${escapeXML(pc.proj4)}</proj4>`);
  parts.push(`${indent}    <path>${escapeXML(pc.path)}</path>`);
  parts.push(`${indent}    <import>${pc.import}</import>`);
  parts.push(
    `${indent}    <numberOfPoints>${pc.numberOfPoints}</numberOfPoints>`
  );
  parts.push(`${indent}    <dsm>`);
  parts.push(`${indent}        <exist>${pc.dsm.exist}</exist>`);
  parts.push(`${indent}        <file>${escapeXML(pc.dsm.file)}</file>`);
  parts.push(`${indent}        <res>${pc.dsm.res}</res>`);
  parts.push(`${indent}    </dsm>`);
  parts.push(`${indent}</pointCloud>`);
  return parts.join("\n");
}

function serializeOrthophoto(
  ortho: any,
  indent: string,
  tagName: string = "orthophoto"
): string {
  const parts: string[] = [];
  parts.push(`${indent}<${tagName}>`);
  parts.push(`${indent}    <id>${escapeXML(ortho.id)}</id>`);
  parts.push(`${indent}    <name>${escapeXML(ortho.name)}</name>`);
  parts.push(`${indent}    <fileType>${ortho.fileType}</fileType>`);
  parts.push(
    `${indent}    <extension>${escapeXML(ortho.extension)}</extension>`
  );
  parts.push(`${indent}    <asset>${escapeXML(ortho.asset)}</asset>`);
  parts.push(`${indent}    <cog>${escapeXML(ortho.cog)}</cog>`);
  parts.push(serializeCenter(ortho.center, `${indent}    `));
  parts.push(`${indent}    <epsg>${escapeXML(ortho.epsg)}</epsg>`);
  parts.push(`${indent}    <epsgText>${escapeXML(ortho.epsgText)}</epsgText>`);
  parts.push(`${indent}    <proj4>${escapeXML(ortho.proj4)}</proj4>`);
  parts.push(`${indent}    <path>${escapeXML(ortho.path)}</path>`);
  parts.push(`${indent}    <cogPath>${escapeXML(ortho.cogPath)}</cogPath>`);
  parts.push(`${indent}    <import>${ortho.import}</import>`);
  parts.push(`${indent}</${tagName}>`);
  return parts.join("\n");
}

function serializeBBox(bbox: any, indent: string): string {
  const parts: string[] = [];
  parts.push(`${indent}<bbox>`);
  parts.push(`${indent}    <min>`);
  parts.push(`${indent}        <x>${bbox.min.x}</x>`);
  parts.push(`${indent}        <y>${bbox.min.y}</y>`);
  parts.push(`${indent}        <z>${bbox.min.z}</z>`);
  parts.push(`${indent}    </min>`);
  parts.push(`${indent}    <max>`);
  parts.push(`${indent}        <x>${bbox.max.x}</x>`);
  parts.push(`${indent}        <y>${bbox.max.y}</y>`);
  parts.push(`${indent}        <z>${bbox.max.z}</z>`);
  parts.push(`${indent}    </max>`);
  parts.push(`${indent}</bbox>`);
  return parts.join("\n");
}

function serializeCenter(center: any, indent: string): string {
  const parts: string[] = [];
  parts.push(`${indent}<center>${center.x}</center>`);
  parts.push(`${indent}<center>${center.y}</center>`);
  return parts.join("\n");
}
