import React from 'react'
import { makeUseStyles } from '../../styles/makeUseStyles'
import { Button } from "../ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs"

const useStyles = makeUseStyles({
    container: {
        width: "100%",
        height: "150px"
    }
})

function RibbonMenu() {
    const styles = useStyles()
    const tablist = [
      { value: "measurement", label: "Measurement" },
      { value: "drawing", label: "Drawing" },
      { value: "point_cloud", label: "Point Cloud" },
      { value: "mesh", label: "Mesh" },
    ]
  return (
    
    <div className='border-b border-border' style={styles.container}>
      <div className="flex w-full max-w-sm flex-col gap-6" style={{width: "100%"}}>
      <Tabs defaultValue="measurement">
        <TabsList>
          {tablist.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="account">
          
        </TabsContent>
        <TabsContent value="password">
          
        </TabsContent>
      </Tabs>
    </div>
    </div>
  )
}

export default RibbonMenu
