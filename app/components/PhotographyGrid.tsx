"use client";

import { useState } from "react";
import PhotoAlbum, { type Photo } from "react-photo-album";
import "react-photo-album/masonry.css";
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

const PHOTOS: Photo[] = [
    { src: "/images/camera/AML07020_07.jpg", width: 5264, height: 3948, alt: "RAVEN CLOSE UP" },
    { src: "/images/camera/AML06293_09.jpg", width: 4240, height: 3180, alt: "CANOPY PARACHUTE" },
    { src: "/images/camera/AML06129_03.jpg", width: 4914, height: 3743, alt: "TWO UMBRELLA" },
    { src: "/images/camera/AML06994_01.jpg", width: 5368, height: 4023, alt: "RAVEN SIDE PROFILE" },
    { src: "/images/camera/AML05828_09.jpg", width: 2744, height: 1832, alt: "MOON AND PLANE" },
    { src: "/images/camera/AML05988_02.jpg", width: 4333, height: 2678, alt: "SUNSET SILLOUETTE" },
];

export default function PhotographyGrid() {
    const [lightboxIndex, setLightboxIndex] = useState(-1);

    return (
        <section className="photography-grid space-y-3">
            <p className="text-md uppercase text-muted-foreground tracking-wide">Photography</p>
            <PhotoAlbum
                layout="masonry"
                photos={PHOTOS}
                spacing={10}
                onClick={({ index }) => setLightboxIndex(index)}
                columns={(containerWidth) => {
                    if (containerWidth < 520) return 2;
                    if (containerWidth < 900) return 3;
                    return 4;
                }}
            />
            <Lightbox
                open={lightboxIndex >= 0}
                close={() => setLightboxIndex(-1)}
                index={lightboxIndex}
                slides={PHOTOS}
                plugins={[Thumbnails, Zoom]}
                thumbnails={{
                    position: "bottom",
                    width: 96,
                    height: 64,
                }}
                zoom={{
                    maxZoomPixelRatio: 4,
                    zoomInMultiplier: 1.5,
                }}
            />
        </section>
    );
}
