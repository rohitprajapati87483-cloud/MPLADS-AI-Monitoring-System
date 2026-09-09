import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateFile, detectFileType } from '@/services/fileParser';
import { FileParseError } from '@/services/fileParser';

const SUPPORTED_EXTENSIONS = ['.csv', '.xlsx', '.xls', '.json'];
const SUPPORTED_MIME = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/json',
  'text/plain',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  isProcessing?: boolean;
  selectedFile?: File | null;
  onClear?: () => void;
  error?: string | null;
  className?: string;
}

export function UploadZone({
  onFileSelected,
  isProcessing = false,
  selectedFile = null,
  onClear,
  error,
  className,
}: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setValidationError(null);
      try {
        validateFile(file);
        onFileSelected(file);
      } catch (err) {
        if (err instanceof FileParseError) {
          setValidationError(err.message);
        } else {
          setValidationError('An unexpected error occurred. Please try again.');
        }
      }
    },
    [onFileSelected],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragOver(false), []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  const displayError = error ?? validationError;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      {!selectedFile ? (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload dataset file"
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          className={cn(
            'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors select-none',
            isDragOver
              ? 'border-primary-500 bg-primary-50'
              : displayError
              ? 'border-red-300 bg-red-50'
              : 'border-slate-300 bg-slate-50 hover:border-primary-400 hover:bg-slate-100',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={SUPPORTED_EXTENSIONS.join(',')}
            className="sr-only"
            onChange={onInputChange}
            aria-hidden="true"
          />

          {/* Icon */}
          <div
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full mb-4',
              isDragOver ? 'bg-primary-100 text-primary-600' : 'bg-white text-slate-400 border border-slate-200',
            )}
          >
            <Upload size={26} />
          </div>

          {/* Text */}
          <p className="text-sm font-semibold text-slate-700 text-center">
            {isDragOver ? 'Drop your file here' : 'Drag & drop your dataset here'}
          </p>
          <p className="text-xs text-slate-400 mt-1">or</p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="mt-2 px-4 py-1.5 text-xs font-semibold rounded-md bg-primary-700 text-white hover:bg-primary-800 transition-colors"
          >
            Browse Files
          </button>

          {/* Format tags */}
          <div className="flex flex-wrap justify-center gap-1.5 mt-5">
            {['CSV', 'XLSX', 'XLS', 'JSON'].map((fmt) => (
              <span
                key={fmt}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-500"
              >
                {fmt}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Maximum file size: 50 MB</p>
        </div>
      ) : (
        /* Selected file card */
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
            <FileText size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{selectedFile.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500">{formatBytes(selectedFile.size)}</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-medium text-slate-500 uppercase">
                {detectFileType(selectedFile.name) ?? 'unknown'}
              </span>
              {!isProcessing && !displayError && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 size={11} />
                    Ready
                  </span>
                </>
              )}
            </div>
          </div>
          {!isProcessing && (
            <button
              onClick={onClear}
              className="flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Remove file"
            >
              <X size={15} />
            </button>
          )}
        </div>
      )}

      {/* Error message */}
      {displayError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
          <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{displayError}</p>
        </div>
      )}
    </div>
  );
}
