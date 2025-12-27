import {
  ProjectXML,
  Project,
  Metadata,
  OutCoordSys,
  MeasurementLayer,
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
  
  // Find the <dem> element first, then get DSM and DTM from within it
  // This prevents selecting <dsm> tags that are inside <pointCloud> elements
  const demElement = element.querySelector("dem");
  
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
    // Only get DSM from within <dem> element, not from <pointCloud> elements
    dsm: demElement 
      ? Array.from(demElement.querySelectorAll("dsm")).map((dsm) =>
          parseOrthophoto(dsm)
        )
      : [],
    // Only get DTM from within <dem> element, not from <pointCloud> elements
    dtm: demElement
      ? Array.from(demElement.querySelectorAll("dtm")).map((dtm) =>
          parseOrthophoto(dtm)
        )
      : [],
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
  
  // Parse center - XML has two separate <center> tags
  const centerElements = element.querySelectorAll("center");
  let center = { x: 0, y: 0 };
  if (centerElements.length >= 2) {
    center = {
      x: getNumberContent(centerElements[0]),
      y: getNumberContent(centerElements[1]),
    };
  } else if (centerElements.length === 1) {
    // Fallback: try to parse as single element
    center = parseCenter(centerElements[0]);
  }
  
  // If center is 0,0, calculate from bbox
  const bbox = parseBBox(element.querySelector("bbox"));
  if (center.x === 0 && center.y === 0 && bbox.min.x !== 0 && bbox.max.x !== 0) {
    center = {
      x: (bbox.min.x + bbox.max.x) / 2,
      y: (bbox.min.y + bbox.max.y) / 2,
    };
  }
  
  return {
    id: getTextContent(element.querySelector("id")),
    name: getTextContent(element.querySelector("name")),
    fileType: "pc" as const,
    extension: getTextContent(element.querySelector("extension")),
    asset: getTextContent(element.querySelector("asset")),
    bbox: bbox,
    center: center,
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
    visible: getBooleanContent(element.querySelector("visible"), true), // Default to true
    layers: parseMeasurementLayers(element.querySelector("layers")),
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

function parseMeasurementLayers(element: Element | null): MeasurementLayer[] {
  if (!element) {
    return [];
  }
  const layerElements = element.querySelectorAll("layer");
  return Array.from(layerElements).map((layerEl) => parseMeasurementLayer(layerEl));
}

function parseMeasurementLayer(element: Element): MeasurementLayer {
  // Parse points array
  const pointsElements = element.querySelectorAll("points > point");
  const points: number[][] = [];
  pointsElements.forEach((pointEl) => {
    const x = getNumberContent(pointEl.querySelector("x"));
    const y = getNumberContent(pointEl.querySelector("y"));
    const z = getNumberContent(pointEl.querySelector("z"));
    points.push([x, y, z]);
  });

  // Parse color array
  const colorElements = element.querySelectorAll("color > value");
  let color: number[] | undefined;
  if (colorElements.length >= 3) {
    color = [
      getNumberContent(colorElements[0]),
      getNumberContent(colorElements[1]),
      getNumberContent(colorElements[2]),
    ];
  }

  return {
    id: getTextContent(element.querySelector("id")),
    name: getTextContent(element.querySelector("name")),
    type: "measurement" as const,
    visible: getBooleanContent(element.querySelector("visible"), true),
    extent: parseBBox(element.querySelector("extent")),
    measurementType: getTextContent(element.querySelector("measurementType")) || undefined,
    pointCloudId: getTextContent(element.querySelector("pointCloudId")),
    points: points.length > 0 ? points : undefined,
    showDistances: getBooleanContent(element.querySelector("showDistances"), undefined),
    showArea: getBooleanContent(element.querySelector("showArea"), undefined),
    showCoordinates: getBooleanContent(element.querySelector("showCoordinates"), undefined),
    closed: getBooleanContent(element.querySelector("closed"), undefined),
    showAngles: getBooleanContent(element.querySelector("showAngles"), undefined),
    showHeight: getBooleanContent(element.querySelector("showHeight"), undefined),
    showCircle: getBooleanContent(element.querySelector("showCircle"), undefined),
    showAzimuth: getBooleanContent(element.querySelector("showAzimuth"), undefined),
    showEdges: getBooleanContent(element.querySelector("showEdges"), undefined),
    color: color,
    icon: getTextContent(element.querySelector("icon")) || undefined,
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
  parts.push(`${indent}    <visible>${pc.visible !== false}</visible>`); // Default to true if not specified
  parts.push(`${indent}    <dsm>`);
  parts.push(`${indent}        <exist>${pc.dsm.exist}</exist>`);
  parts.push(`${indent}        <file>${escapeXML(pc.dsm.file)}</file>`);
  parts.push(`${indent}        <res>${pc.dsm.res}</res>`);
  parts.push(`${indent}    </dsm>`);
  // Serialize measurement layers
  if (pc.layers && pc.layers.length > 0) {
    parts.push(`${indent}    <layers>`);
    pc.layers.forEach((layer: any) => {
      parts.push(serializeMeasurementLayer(layer, `${indent}        `));
    });
    parts.push(`${indent}    </layers>`);
  }
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

function serializeMeasurementLayer(layer: MeasurementLayer, indent: string): string {
  const parts: string[] = [];
  parts.push(`${indent}<layer>`);
  parts.push(`${indent}    <id>${escapeXML(layer.id)}</id>`);
  parts.push(`${indent}    <name>${escapeXML(layer.name)}</name>`);
  parts.push(`${indent}    <type>${layer.type}</type>`);
  parts.push(`${indent}    <visible>${layer.visible}</visible>`);
  parts.push(`${indent}    <extent>`);
  parts.push(serializeBBox(layer.extent, `${indent}        `));
  parts.push(`${indent}    </extent>`);
  if (layer.measurementType) {
    parts.push(`${indent}    <measurementType>${escapeXML(layer.measurementType)}</measurementType>`);
  }
  parts.push(`${indent}    <pointCloudId>${escapeXML(layer.pointCloudId)}</pointCloudId>`);
  
  // Serialize points if available
  if (layer.points && layer.points.length > 0) {
    parts.push(`${indent}    <points>`);
    layer.points.forEach((point) => {
      parts.push(`${indent}        <point>`);
      parts.push(`${indent}            <x>${point[0]}</x>`);
      parts.push(`${indent}            <y>${point[1]}</y>`);
      parts.push(`${indent}            <z>${point[2]}</z>`);
      parts.push(`${indent}        </point>`);
    });
    parts.push(`${indent}    </points>`);
  }
  
  // Serialize measurement properties
  if (layer.showDistances !== undefined) {
    parts.push(`${indent}    <showDistances>${layer.showDistances}</showDistances>`);
  }
  if (layer.showArea !== undefined) {
    parts.push(`${indent}    <showArea>${layer.showArea}</showArea>`);
  }
  if (layer.showCoordinates !== undefined) {
    parts.push(`${indent}    <showCoordinates>${layer.showCoordinates}</showCoordinates>`);
  }
  if (layer.closed !== undefined) {
    parts.push(`${indent}    <closed>${layer.closed}</closed>`);
  }
  if (layer.showAngles !== undefined) {
    parts.push(`${indent}    <showAngles>${layer.showAngles}</showAngles>`);
  }
  if (layer.showHeight !== undefined) {
    parts.push(`${indent}    <showHeight>${layer.showHeight}</showHeight>`);
  }
  if (layer.showCircle !== undefined) {
    parts.push(`${indent}    <showCircle>${layer.showCircle}</showCircle>`);
  }
  if (layer.showAzimuth !== undefined) {
    parts.push(`${indent}    <showAzimuth>${layer.showAzimuth}</showAzimuth>`);
  }
  if (layer.showEdges !== undefined) {
    parts.push(`${indent}    <showEdges>${layer.showEdges}</showEdges>`);
  }
  
  // Serialize color if available
  if (layer.color && layer.color.length >= 3) {
    parts.push(`${indent}    <color>`);
    parts.push(`${indent}        <value>${layer.color[0]}</value>`);
    parts.push(`${indent}        <value>${layer.color[1]}</value>`);
    parts.push(`${indent}        <value>${layer.color[2]}</value>`);
    parts.push(`${indent}    </color>`);
  }
  
  // Serialize icon if available
  if (layer.icon) {
    parts.push(`${indent}    <icon>${escapeXML(layer.icon)}</icon>`);
  }
  
  parts.push(`${indent}</layer>`);
  return parts.join("\n");
}
