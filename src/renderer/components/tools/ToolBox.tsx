import React from "react";
import { makeUseStyles } from "../../styles/makeUseStyles";
import { Boxes, Wrench, X } from "lucide-react";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const useStyles = makeUseStyles({
  container: {
    width: "100%",
    height: "100%",
  },
  header: {
    height: "20px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: "10px",
    background: "#262626",
  },
  body: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    height: "calc(100% - 20px)",
    overflowY: "auto",
    background: "#1e1e1e",
  },
  toolboxMenu: {
    width: "50px",
    height: "100%",
    background: "#212121",
  },
  toolboxContent: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "calc(100% - 40px)",
    paddingLeft: "10px",
  },
});

function Toolbox() {
  const styles = useStyles();
  const tablist = [
    { value: "measurement", label: "Measurement", icon: Wrench },
    { value: "drawing", label: "Drawing", icon: Wrench },
    { value: "point_cloud", label: "Point Cloud", icon: Wrench },
    { value: "mesh", label: "Mesh", icon: Wrench },
  ];
  return (
    <div style={styles.container} className="border-r border-border">
      <div style={styles.header}>
        <Label icon={Boxes} iconClassName="h-3 w-3">
          Toolbox
        </Label>
        <div>
          <X
            className="h-3.5 w-3.5"
            style={{ position: "relative", cursor: "pointer", right: "3px" }}
          />
        </div>
      </div>
      <div style={styles.body}>
        <div style={styles.toolboxMenu} className="border-r border-border">
          <Tabs defaultValue="measurement" orientation="vertical" size="md" style={{padding: 0}}>
            <TabsList onChange={(value) => {
            console.log("Selected Tab:", value);
          }}>
              {tablist.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} icon={tab.icon} style={{padding: 9.5}}/>
              ))}
            </TabsList>
            <TabsContent value="account"></TabsContent>
            <TabsContent value="password"></TabsContent>
          </Tabs>
        </div>
        <div style={styles.toolboxContent}></div>
      </div>
    </div>
  );
}

export default Toolbox;
