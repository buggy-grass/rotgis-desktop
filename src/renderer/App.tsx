import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Divider } from './components/ui/divider';
import { WindowCustomBar } from './components/WindowCustomBar';
import { Moon, Sun, Zap } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <WindowCustomBar />
      <div className="flex-1 container mx-auto p-8 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            {/* <h1 className="text-3xl font-bold">RotGIS Desktop</h1> */}
          </div>
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Dark Mode</span>
            <Moon className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Electron</CardTitle>
              <CardDescription>Desktop uygulama framework'ü</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Electron ile cross-platform desktop uygulaması geliştiriyoruz.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>React + TypeScript</CardTitle>
              <CardDescription>Modern UI geliştirme</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                TypeScript ile tip güvenli React bileşenleri kullanıyoruz.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shadcn UI</CardTitle>
              <CardDescription>Güzel ve erişilebilir bileşenler</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Shadcn UI ile modern ve özelleştirilebilir bileşenler.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 space-y-6">
          <div className="flex gap-4">
            <Button>Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
          </div>
          
          <Divider />
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Renk Önizlemesi</h3>
            <p className="text-sm text-muted-foreground">
              Dark mode renkleri #141414 ana renk ve profesyonel gri tonları ile ayarlandı.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

