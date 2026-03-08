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
    { src: "/images/camera/AML06129.jpg", width: 4673, height: 3417, alt: "Photography shot AML05497" },
    { src: "/images/camera/AML05832.jpg", width: 2505, height: 1548, alt: "Photography shot AML05832" },
    { src: "/images/camera/AML05988.jpg", width: 4333, height: 2678, alt: "Photography shot AML05988" },
    { src: "/images/camera/AML06293_01.jpg", width: 5560, height: 3932, alt: "Photography shot AML05707_01" },
    { src: "/images/camera/AML06407.jpg", width: 6026, height: 4024, alt: "Photography shot AML05782" },
    { src: "/images/camera/AML05726.jpg", width: 5272, height: 3520, alt: "Photography shot AML05741" },
    { src: "/images/camera/AML06125_02.jpg", width: 5787, height: 3683, alt: "Photography shot AML05803" },
    { src: "/images/camera/AML05498.jpg", width: 6026, height: 4024, alt: "Photography shot AML05498" },
    { src: "/images/camera/AML06136.jpg", width: 5539, height: 3927, alt: "Photography shot AML05624" },
    { src: "/images/camera/AML05871.jpg", width: 4255, height: 2630, alt: "Photography shot AML05871" },
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
