"use client";

import * as React from "react";
import Image from "next/image";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  DragOverlay,
  type DropAnimation,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImagePlus, Trash2 } from "lucide-react";

type PhotoDraft = {
  id: string;
  file: File;
  previewUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  order: number;
};

export type { PhotoDraft };

type SortablePhotoTileProps = {
  photo: PhotoDraft;
  index: number;
  isCover: boolean;
  onRemove: (id: string) => void;
};

const SortablePhotoTile = ({
  photo,
  index,
  isCover,
  onRemove,
}: SortablePhotoTileProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: photo.id,
      transition: {
        duration: 200,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative select-none overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:bg-slate-100 active:cursor-grabbing ${
        isDragging ? "opacity-0" : ""
      } ${isCover ? "col-span-2 sm:col-span-1 rounded-2xl sm:rounded-xl" : ""}`}
      {...attributes}
      {...listeners}
    >
      <Image
        src={photo.previewUrl}
        alt={photo.fileName}
        width={320}
        height={200}
        unoptimized
        className={`w-full object-cover ${
          isCover ? "aspect-square" : "aspect-square"
        }`}
      />
      {index === 0 && (
        <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700">
          Cover
        </div>
      )}
      <button
        type="button"
        onClick={() => onRemove(photo.id)}
        className="absolute right-2 top-2 rounded-full bg-white/80 p-1 text-red-600 shadow transition-opacity duration-150 opacity-100 hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
      >
        <span className="sr-only">Remove</span>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};

type PhotoUploadFieldProps = {
  photos: PhotoDraft[];
  onChange: (photos: PhotoDraft[]) => void;
  maxImages?: number;
  maxFileSizeMB?: number;
  label?: string;
  helperText?: string;
  youtubeValue?: string;
  onYoutubeChange?: (value: string) => void;
};

const DEFAULT_MAX_IMAGES = 10;
const DEFAULT_MAX_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const toMB = (bytes: number) => bytes / (1024 * 1024);

export default function PhotoUploadField({
  photos,
  onChange,
  maxImages = DEFAULT_MAX_IMAGES,
  maxFileSizeMB = DEFAULT_MAX_SIZE_MB,
  label = "Photos and video",
  helperText = "Add up to 10 photos",
  youtubeValue,
  onYoutubeChange,
}: PhotoUploadFieldProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const currentCount = photos.length;

  const updatePhotos = (next: PhotoDraft[]) => {
    onChange(next.map((photo, index) => ({ ...photo, order: index })));
  };

  const handleFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    if (!incoming.length) return;

    const availableSlots = Math.max(0, maxImages - currentCount);
    if (availableSlots === 0) {
      setError(`You can upload up to ${maxImages} photos.`);
      return;
    }

    const nextPhotos: PhotoDraft[] = [];
    const errors: string[] = [];

    incoming.slice(0, availableSlots).forEach((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        errors.push(`${file.name} is not a supported file type.`);
        return;
      }
      if (toMB(file.size) > maxFileSizeMB) {
        errors.push(`${file.name} exceeds ${maxFileSizeMB}MB.`);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      nextPhotos.push({
        id: createId(),
        file,
        previewUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        order: currentCount + nextPhotos.length,
      });
    });

    if (errors.length) {
      setError(errors[0]);
    } else {
      setError(null);
    }
    if (nextPhotos.length) {
      updatePhotos([...photos, ...nextPhotos]);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      handleFiles(event.target.files);
      event.target.value = "";
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files) {
      handleFiles(event.dataTransfer.files);
    }
  };

  const handleRemove = (id: string) => {
    const removed = photos.find((photo) => photo.id === id);
    if (removed?.previewUrl) {
      URL.revokeObjectURL(removed.previewUrl);
    }
    updatePhotos(photos.filter((photo) => photo.id !== id));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const dropAnimation: DropAnimation = {
    duration: 200,
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((photo) => photo.id === active.id);
    const newIndex = photos.findIndex((photo) => photo.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    updatePhotos(arrayMove(photos, oldIndex, newIndex));
  };

  const activePhoto = activeId
    ? photos.find((photo) => photo.id === activeId) ?? null
    : null;

  return (
  <section className="form-section form-card gap-3 sm:gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="form-card-title">{label}</h3>
          <p className="text-xs text-slate-500">{helperText}</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {currentCount === 0 && (
        <div
          className={`mt-3 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center transition ${
            isDragging
              ? "border-slate-400 bg-slate-50"
              : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
        >
          <ImagePlus className="h-12 w-12 text-gray-500" />
          <p className="text-sm font-medium text-slate-700">Add photos</p>
          <p className="text-xs text-slate-500">Drag & drop or click to upload</p>
          <p className="mt-1 text-xs text-slate-400">Up to {maxImages} images</p>
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {currentCount > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={photos.map((photo) => photo.id)}
            strategy={rectSortingStrategy}
          >
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {photos.map((photo, index) => (
                <SortablePhotoTile
                  key={photo.id}
                  photo={photo}
                  index={index}
                  isCover={index === 0}
                  onRemove={handleRemove}
                />
              ))}

              {currentCount < maxImages && (
                <div
                  className={`flex aspect-square cursor-pointer items-center justify-center rounded-xl border border-dashed transition ${
                    isDragging
                      ? "border-slate-400 bg-slate-50"
                      : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
                  }`}
                  onClick={() => inputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                >
                  <ImagePlus className="h-9 w-9 text-gray-500" />
                </div>
              )}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={dropAnimation}>
            {activePhoto ? (
              <div className="pointer-events-none overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <Image
                  src={activePhoto.previewUrl}
                  alt={activePhoto.fileName}
                  width={320}
                  height={200}
                  unoptimized
                  className="aspect-square w-full object-cover"
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}


      {onYoutubeChange && (
        <div className="mt-4">
          <label htmlFor="youtube-video" className="field-label">
            Optional YouTube video
          </label>
          <input
            id="youtube-video"
            className="input field-input"
            value={youtubeValue ?? ""}
            onChange={(event) => onYoutubeChange(event.target.value)}
            placeholder="Paste a YouTube link"
          />
        </div>
      )}
    </section>
  );
}
