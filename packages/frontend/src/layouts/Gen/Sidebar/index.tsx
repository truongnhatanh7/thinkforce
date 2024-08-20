import { useListDocQuery } from "@/api/useDocQuery";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { refineMarkdownTitleToFlatString } from "@/lib/utils";
import { HistoryIcon, MenuIcon, WandSparklesIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [width, setWidth] = useState("w-12");

  const docs = useListDocQuery();

  if (docs.error || !docs.data) {
    return <div>Unexpected error</div>;
  }

  return (
    <div
      className={`sticky top-0 left-0 h-screen transition-all ${width} flex flex-col gap-2 bg-background`}
    >
      <div className="flex gap-3 items-center">
        <Button
          variant="secondary"
          className="w-12 rounded-none transition-all !opacity-100"
          onClick={() => {
            if (!isOpen) {
              setIsOpen(true);
              setWidth("w-4/12");
            } else {
              setIsOpen(false);
              setWidth("w-12");
            }
          }}
        >
          <MenuIcon className="w-4 h-4" />
        </Button>
        <p
          className={`opacity-0 ${
            isOpen ? "opacity-80" : ""
          } transition-all font-semibold`}
        >
          ThinkForce
        </p>
      </div>

      <div
        className={`opacity-0 ${
          isOpen ? "opacity-80" : ""
        } transition-all flex flex-col h-full`}
      >
        <div className={`m-2`}>
          <Link to={`/`}>
            <Button
              variant="secondary"
              className="justify-start text-ellipsis w-full overflow-clip"
            >
              Create new research <WandSparklesIcon className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className={`flex flex-col px-2 gap-0 h-full`}>
          <h1 className="h-10 px-4 py-2 font-semibold">
            History <HistoryIcon className="inline-block h-4 w-4" />
          </h1>
          <Separator />
          {docs.data!.map((docMeta, i) => (
            <Link
              key={i + docMeta.file_name}
              to={`/viewer/${encodeURIComponent(docMeta.file_name)}`}
            >
              <Button
                variant="ghost"
                className="rounded-none flex justify-start text-ellipsis w-full overflow-clip"
              >
                {refineMarkdownTitleToFlatString(docMeta.title)}
              </Button>
            </Link>
          ))}
        </div>

        <div className="mt-auto">
          <Button className="rounded-none w-full" variant="ghost">
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
