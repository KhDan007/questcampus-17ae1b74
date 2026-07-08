import { assetUrl } from "@/lib/assets";
import harvard from "./harvard.png.asset.json";
import stanford from "./stanford.png.asset.json";
import mit from "./mit.png.asset.json";
import oxford from "./oxford.png.asset.json";
import cambridge from "./cambridge.png.asset.json";
import yale from "./yale.png.asset.json";
import princeton from "./princeton.png.asset.json";
import nyu from "./nyu.png.asset.json";
import columbia from "./columbia.png.asset.json";
import imperial from "./imperial.webp.asset.json";
import berkeley from "./berkeley.svg.asset.json";
import eth from "./eth.png.asset.json";
import mcgill from "./mcgill.png.asset.json";
import edinburgh from "./edinburgh.png.asset.json";
import trinity from "./trinity.png.asset.json";
import nus from "./nus.png.asset.json";
import tokyo from "./tokyo.png.asset.json";
import sciencespo from "./sciencespo.png.asset.json";

export const UNI_LOGOS: Record<string, string> = {
  Harvard: assetUrl(harvard),
  Stanford: assetUrl(stanford),
  MIT: assetUrl(mit),
  Oxford: assetUrl(oxford),
  Cambridge: assetUrl(cambridge),
  Yale: assetUrl(yale),
  Princeton: assetUrl(princeton),
  NYU: assetUrl(nyu),
  Columbia: assetUrl(columbia),
  Imperial: assetUrl(imperial),
  "UC Berkeley": assetUrl(berkeley),
  "ETH Zurich": assetUrl(eth),
  McGill: assetUrl(mcgill),
  Edinburgh: assetUrl(edinburgh),
  Trinity: assetUrl(trinity),
  NUS: assetUrl(nus),
  Tokyo: assetUrl(tokyo),
  "Sciences Po": assetUrl(sciencespo),
};
