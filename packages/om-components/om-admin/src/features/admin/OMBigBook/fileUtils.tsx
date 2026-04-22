import React from 'react';
import { Chip } from '@mui/material';
import {
  Description as FileTextIcon,
  Code as CodeIcon,
  Storage as DatabaseIcon,
  Article as ArticleIcon,
  Javascript as JavaScriptIcon,
  Code as ShellScriptIcon,
  Code as PythonIcon,
  Html as HtmlIcon,
  Css as CssIcon,
  DataObject as JsonIcon,
  Code as XmlIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Archive as ArchiveIcon,
  PictureAsPdf as PdfIcon,
  TextSnippet as TextIcon,
} from '@mui/icons-material';
import type { FileUpload } from './types';

export const getFileTypeFromExtension = (extension: string): FileUpload['type'] => {
  switch (extension) {
    case 'sql':
      return 'sql';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return 'javascript';
    case 'sh':
    case 'bash':
    case 'zsh':
      return 'shell';
    case 'py':
    case 'python':
      return 'python';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
    case 'sass':
      return 'css';
    case 'json':
      return 'json';
    case 'xml':
      return 'xml';
    case 'txt':
    case 'log':
      return 'text';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return 'image';
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
      return 'video';
    case 'mp3':
    case 'wav':
    case 'ogg':
      return 'audio';
    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
      return 'archive';
    case 'pdf':
      return 'pdf';
    default:
      return 'other';
  }
};

export const getFileIcon = (type: string) => {
  switch (type) {
    case 'sql':
      return <DatabaseIcon />;
    case 'markdown':
      return <ArticleIcon />;
    case 'javascript':
      return <JavaScriptIcon />;
    case 'shell':
      return <ShellScriptIcon />;
    case 'python':
      return <PythonIcon />;
    case 'html':
      return <HtmlIcon />;
    case 'css':
      return <CssIcon />;
    case 'json':
      return <JsonIcon />;
    case 'xml':
      return <XmlIcon />;
    case 'text':
      return <TextIcon />;
    case 'image':
      return <ImageIcon />;
    case 'video':
      return <VideoIcon />;
    case 'audio':
      return <AudioIcon />;
    case 'archive':
      return <ArchiveIcon />;
    case 'pdf':
      return <PdfIcon />;
    case 'script':
      return <CodeIcon />;
    default:
      return <FileTextIcon />;
  }
};

export const getFileTypeChip = (type: string) => {
  switch (type) {
    case 'sql':
      return <Chip label="SQL" size="small" color="primary" />;
    case 'markdown':
      return <Chip label="Markdown" size="small" color="info" />;
    case 'javascript':
      return <Chip label="JavaScript" size="small" color="warning" />;
    case 'shell':
      return <Chip label="Shell" size="small" color="success" />;
    case 'python':
      return <Chip label="Python" size="small" color="secondary" />;
    case 'html':
      return <Chip label="HTML" size="small" color="error" />;
    case 'css':
      return <Chip label="CSS" size="small" color="info" />;
    case 'json':
      return <Chip label="JSON" size="small" color="warning" />;
    case 'xml':
      return <Chip label="XML" size="small" color="secondary" />;
    case 'text':
      return <Chip label="Text" size="small" color="default" />;
    case 'image':
      return <Chip label="Image" size="small" color="success" />;
    case 'video':
      return <Chip label="Video" size="small" color="error" />;
    case 'audio':
      return <Chip label="Audio" size="small" color="info" />;
    case 'archive':
      return <Chip label="Archive" size="small" color="warning" />;
    case 'pdf':
      return <Chip label="PDF" size="small" color="error" />;
    case 'script':
      return <Chip label="Script" size="small" color="secondary" />;
    default:
      return <Chip label="Other" size="small" color="default" />;
  }
};
