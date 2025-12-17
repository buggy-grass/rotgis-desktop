import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  Grid3x3,
  ArrowUp,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { throttle } from "lodash";
import { MathUtils, Matrix4, Vector3 } from "three";
import { cn } from "../../lib/utils";

const HeightProfileViewer = ({ display }: { display: string }) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 64, y: 80 });
  const mouseCoords = useRef({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isDarkMode = true
  const toolsPlacement = true

  const checkMenuPosition = () => {
    const menu = menuRef.current?.getBoundingClientRect();
    mouseCoords.current.lastX = Number(menu?.left);
    mouseCoords.current.lastY = Number(menu?.top);
  };

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const menuWidth = 360;
      const menuHeight = 215;

      const newX = Math.min(menuPosition.x, windowWidth - menuWidth);
      const newY = Math.min(menuPosition.y, windowHeight - menuHeight);

      setMenuPosition({ x: Math.max(0, newX), y: Math.max(0, newY) });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [menuPosition.x, menuPosition.y]);

  useEffect(() => {
    const handleMouseMove = throttle((e: MouseEvent) => {
      if (isDragging && menuRef.current) {
        const nextX =
          e.clientX -
          mouseCoords.current.startX +
          mouseCoords.current.lastX -
          (toolsPlacement ? 364 : 64);
        const nextY =
          e.clientY -
          mouseCoords.current.startY +
          mouseCoords.current.lastY -
          100;
        setMenuPosition({ x: nextX, y: nextY });
      }
    }, 5);

    const handleMouseUp = () => {
      setIsDragging(false);

      checkMenuPosition();

      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, toolsPlacement]);

  const rotate = (profileWindowController: any, radians: any) => {
    const points = profileWindowController.profile.points;
    const start = points[0];
    const end = points[points.length - 1];
    const center = start.clone().add(end).multiplyScalar(0.5);

    const mMoveOrigin = new Matrix4().makeTranslation(
      -center.x,
      -center.y,
      -center.z
    );
    const mRotate = new Matrix4().makeRotationZ(radians);
    const mMoveBack = new Matrix4().makeTranslation(
      center.x,
      center.y,
      center.z
    );
    //const transform = mMoveOrigin.multiply(mRotate).multiply(mMoveBack);
    const transform = mMoveBack.multiply(mRotate).multiply(mMoveOrigin);

    const rotatedPoints = points.map((point: any) =>
      point.clone().applyMatrix4(transform)
    );

    profileWindowController.autoFitEnabled = false;

    for (let i = 0; i < points.length; i++) {
      profileWindowController.profile.setPosition(i, rotatedPoints[i]);
    }
  };

  const rotateHeightProfile = (type: string) => {
    if (window.viewer) {
      const profileWindowController = window.viewer.profileWindowController;
      switch (type) {
        case "rotate_cw": {
          const radians = MathUtils.degToRad(
            profileWindowController.rotateAmount
          );
          rotate(profileWindowController, -radians);
          break;
        }
        case "rotate_ccw": {
          const radians = MathUtils.degToRad(
            profileWindowController.rotateAmount
          );
          rotate(profileWindowController, radians);
          break;
        }
        case "profile_move_forward": {
          const profile = profileWindowController.profile;
          const points = profile.points;
          if (points) {
            const start = points[0];
            const end = points[points.length - 1];

            const dir = end.clone().sub(start).normalize();
            const up = new Vector3(0, 0, 1);
            const forward = up.cross(dir);
            const move = forward.clone().multiplyScalar(profile.width / 2);

            profileWindowController.autoFitEnabled = false;

            for (let i = 0; i < points.length; i++) {
              profile.setPosition(i, points[i].clone().add(move));
            }
          }
          break;
        }
        case "profile_move_backward":
          {
            const profile = profileWindowController.profile;
            const points = profile.points;
            if (points) {
              const start = points[0];
              const end = points[points.length - 1];

              const dir = end.clone().sub(start).normalize();
              const up = new Vector3(0, 0, 1);
              const forward = up.cross(dir);
              const move = forward.clone().multiplyScalar(-profile.width / 2);

              profileWindowController.autoFitEnabled = false;

              for (let i = 0; i < points.length; i++) {
                profile.setPosition(i, points[i].clone().add(move));
              }
            }
          }
          break;
      }
    }
  };

  return (
    <div
      className={cn(
        "absolute z-[9997] w-full",
        isDarkMode ? "border border-[#454545]" : "border border-[rgb(205,205,205)]"
      )}
      style={{
        display,
        height: "calc(100% - 45px)",
        borderRadius: "3px",
        boxShadow: "0px 0px 0.5px #484848",
      }}
      ref={menuRef}
    >
      <div className="w-full h-[calc(100%-45px)]">
        <div
          id="profile_window"
          className="relative w-full h-full p-0 hidden box-border z-[10000]"
        >
          <div
            id="profileSelectionProperties"
            className="absolute left-[50px] top-[42px] bg-[rgba(99,99,99,0.35)] opacity-100 p-[5px] min-w-[210px] rounded-[3px] select-text overflow-hidden"
          >
            <table className="text-white leading-3 font-bold">
              <thead></thead>
              <tbody>
                <tr className="text-white text-[0.7rem]">
                  <td data-i18n="height_profile.x">X</td>
                  <td id="profile-x"></td>
                </tr>
                <tr className="text-white text-[0.7rem]">
                  <td data-i18n="height_profile.y">Y</td>
                  <td id="profile-y"></td>
                </tr>
                <tr className="text-white text-[0.7rem]">
                  <td data-i18n="height_profile.z">Z</td>
                  <td id="profile-z"></td>
                </tr>
                <tr className="text-white text-[0.7rem]">
                  <td data-i18n="height_profile.RGBA">RGBA</td>
                  <td id="profile-rgba"></td>
                </tr>
                <tr className="text-white text-[0.7rem]">
                  <td data-i18n="height_profile.a_milage">
                    {t(
                      "pages.HomePage.components.heightProfileMain.heightProfileCanvas.milage",
                      { defaultValue: "Metre" }
                    )}
                  </td>
                  <td id="profile-milage"></td>
                </tr>
                <tr className="text-white text-[0.7rem]">
                  <td data-i18n="height_profile.intensity">
                    {t(
                      "pages.HomePage.components.heightProfileMain.heightProfileCanvas.intensity",
                      { defaultValue: "Yoğunluk" }
                    )}
                  </td>
                  <td id="profile-intensity"></td>
                </tr>
                <tr className="text-white text-[0.7rem]">
                  <td data-i18n="height_profile.return_number">
                    {t(
                      "pages.HomePage.components.heightProfileMain.heightProfileCanvas.returnNumber",
                      { defaultValue: "Dönüş Sayısı" }
                    )}
                  </td>
                  <td id="profile-return-number"></td>
                </tr>
                <tr className="text-white text-[0.7rem]">
                  <td data-i18n="height_profile.total_number">
                    {t(
                      "pages.HomePage.components.heightProfileMain.heightProfileCanvas.totalNumber",
                      { defaultValue: "Max Dönüş Sayısı" }
                    )}
                  </td>
                  <td id="profile-total-ret-number"></td>
                </tr>
                <tr className="text-white text-[0.7rem]">
                  <td data-i18n="height_profile.class">
                    {t(
                      "pages.HomePage.components.heightProfileMain.heightProfileCanvas.class",
                      { defaultValue: "Sınıf" }
                    )}
                  </td>
                  <td id="profile-class"></td>
                </tr>
                <tr className="text-white text-[0.7rem]">
                  <td data-i18n="height_profile.a_scan_rank">
                    {t(
                      "pages.HomePage.components.heightProfileMain.heightProfileCanvas.scanRank",
                      { defaultValue: "Tarama Açısı" }
                    )}
                  </td>
                  <td id="profile-scan-rank"></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            className="absolute w-full h-full box-border pw_content"
          >
            <span
              className="pv-main-color"
              style={{
                height: "calc(100% + 45px)",
                width: "100%",
                padding: "5px",
                paddingTop: "2.5px",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
              }}
            >
              <div
                className={cn(
                  "w-full flex flex-row items-center box-border pr-[5px] pl-[9px] pb-[2.5px]",
                  isDarkMode ? "text-[#848484]" : "text-[#565555]"
                )}
              >
                <div className="flex items-center">
                  <Grid3x3 className="w-3.5 h-3.5 text-[#848484]" />
                  <span
                    className={cn(
                      "ml-[3px] font-bold text-xs",
                      isDarkMode ? "text-[#848484]" : "text-[#848484]"
                    )}
                  >
                    {t(
                      "pages.HomePage.components.heightProfileMain.pointCount",
                      { defaultValue: "Nokta Sayısı" }
                    )}{" "}
                    :{" "}
                  </span>
                </div>
                <span
                  id="profile_num_points"
                  className={cn(
                    "ml-[3px] font-bold text-xs",
                    isDarkMode ? "text-[#848484]" : "text-[#848484]"
                  )}
                >
                  -
                </span>
                <span className="flex-grow"></span>
                <Input
                  id="potree_profile_rotate_amount"
                  type="number"
                  min={10}
                  max={99}
                  defaultValue="10"
                  className="text-center min-w-[5px] max-w-[50px] h-8"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        id="potree_profile_rotate_ccw"
                        onClick={() => rotateHeightProfile("rotate_ccw")}
                        className="h-8 w-8"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("pages.HomePage.components.heightProfileMain.tools.rotateLeft", {
                        defaultValue: "Sola Döndür",
                      })}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        id="potree_profile_rotate_cw"
                        onClick={() => rotateHeightProfile("rotate_cw")}
                        className="h-8 w-8"
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("pages.HomePage.components.heightProfileMain.tools.rotateRight", {
                        defaultValue: "Sağa Döndür",
                      })}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        id="potree_profile_move_forward"
                        onClick={() => rotateHeightProfile("profile_move_forward")}
                        className="h-8 w-8"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("pages.HomePage.components.heightProfileMain.tools.moveForward", {
                        defaultValue: "İleri Ötele",
                      })}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        id="potree_profile_move_backward"
                        onClick={() => rotateHeightProfile("profile_move_backward")}
                        className="h-8 w-8"
                      >
                        <ArrowUp className="h-4 w-4 rotate-180" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("pages.HomePage.components.heightProfileMain.tools.moveBackward", {
                        defaultValue: "Geri Ötele",
                      })}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div
                id="profile_draw_container"
                className="w-full flex-grow relative h-full box-border select-none"
              >
                <div
                  className="absolute left-[41px] top-0 bottom-[20px] w-[calc(100%-41px)] h-[calc(100%-20px)] bg-black opacity-20"
                ></div>
                <svg
                  id="profileSVG"
                  className="absolute left-0 right-0 top-0 bottom-0 w-full h-full"
                ></svg>
                <div
                  id="profileCanvasContainer"
                  className="absolute left-[41px] top-0 bottom-[20px] w-[calc(100%-41px)] h-[calc(100%-20px)]"
                  onMouseDown={(e) => {
                    if (e.button === 1) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                ></div>
              </div>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeightProfileViewer;
