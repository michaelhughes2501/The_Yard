import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { AppDocument } from '../types';
import { FileText, Upload, Trash2, Download, File, FileImage, FileArchive, Camera, RefreshCw, Check, X, Sparkles, AlertCircle, Folder, FolderPlus, FolderOpen, Edit3, Info } from 'lucide-react';
import ConfirmationDialog from './ConfirmationDialog';

export default function Vault() {
  const { token, user } = useAuth();
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ID');
  const [filterCategory, setFilterCategory] = useState('All');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for confirmation dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<AppDocument | null>(null);

  // States for camera document scanner
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>('');
  const [scanPreviewImage, setScanPreviewImage] = useState<string | null>(null);
  const [scanFilter, setScanFilter] = useState<'original' | 'grayscale' | 'contrast'>('original');
  const [scanTitle, setScanTitle] = useState('');
  const [scanCategory, setScanCategory] = useState('ID');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanningActive, setIsScanningActive] = useState(false);

  // Custom Categories States
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showAddFolderInput, setShowAddFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderOriginalName, setEditingFolderOriginalName] = useState<string | null>(null);
  const [editingFolderNameValue, setEditingFolderNameValue] = useState('');

  // Edit / Move Document states
  const [editingDoc, setEditingDoc] = useState<AppDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDocOpen, setEditDocOpen] = useState(false);

  // Drag and Drop States
  const [draggedDoc, setDraggedDoc] = useState<AppDocument | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // Folder info modal state
  const [selectedFolderInfo, setSelectedFolderInfo] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load custom categories on mount
  useEffect(() => {
    const userSuffix = user?.id || 'default';
    const stored = localStorage.getItem(`vault_custom_categories_${userSuffix}`);
    if (stored) {
      try {
        setCustomCategories(JSON.parse(stored));
      } catch (err) {
        console.error("Error loading custom categories", err);
      }
    }
  }, [user]);

  const saveCustomCategories = (updated: string[]) => {
    setCustomCategories(updated);
    const userSuffix = user?.id || 'default';
    localStorage.setItem(`vault_custom_categories_${userSuffix}`, JSON.stringify(updated));
  };

  // Helper actions for custom folders
  const handleCreateFolder = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    const standard = ['ID', 'Court', 'Resume', 'Certificate', 'Other', 'All'];
    if (standard.some(s => s.toLowerCase() === name.toLowerCase()) || customCategories.some(c => c.toLowerCase() === name.toLowerCase())) {
      alert("A folder with this name already exists.");
      return;
    }

    const updated = [...customCategories, name];
    saveCustomCategories(updated);
    setNewFolderName('');
    setShowAddFolderInput(false);
  };

  const handleRenameFolder = async (oldName: string, newName: string) => {
    const cleanNewName = newName.trim();
    if (!cleanNewName || oldName === cleanNewName) {
      setEditingFolderOriginalName(null);
      return;
    }

    const standard = ['ID', 'Court', 'Resume', 'Certificate', 'Other', 'All'];
    if (standard.some(s => s.toLowerCase() === cleanNewName.toLowerCase()) || (customCategories.some(c => c.toLowerCase() === cleanNewName.toLowerCase() && c !== oldName))) {
      alert("A folder with this name already exists.");
      return;
    }

    // Update custom categories array
    const updated = customCategories.map(c => c === oldName ? cleanNewName : c);
    saveCustomCategories(updated);
    setEditingFolderOriginalName(null);

    // Update documents category on server
    const docsToUpdate = documents.filter(d => d.category === oldName);
    if (docsToUpdate.length > 0) {
      for (const doc of docsToUpdate) {
        try {
          await fetch(`/api/documents/${doc.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ category: cleanNewName })
          });
        } catch (err) {
          console.error(`Error updating document ${doc.id} during folder rename:`, err);
        }
      }
      fetchDocuments();
    }

    if (filterCategory === oldName) {
      setFilterCategory(cleanNewName);
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    if (!confirm(`Are you sure you want to delete the "${folderName}" folder? Documents inside will be moved to the "Other" folder.`)) {
      return;
    }

    const updated = customCategories.filter(c => c !== folderName);
    saveCustomCategories(updated);

    // Reset documents inside to standard 'Other'
    const docsToUpdate = documents.filter(d => d.category === folderName);
    if (docsToUpdate.length > 0) {
      for (const doc of docsToUpdate) {
        try {
          await fetch(`/api/documents/${doc.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ category: 'Other' })
          });
        } catch (err) {
          console.error(`Error updating document ${doc.id} on folder delete:`, err);
        }
      }
      fetchDocuments();
    }

    if (filterCategory === folderName) {
      setFilterCategory('All');
    }
  };

  const handleSaveEditDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;

    try {
      const res = await fetch(`/api/documents/${editingDoc.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle.trim() || editingDoc.title,
          category: editCategory
        })
      });

      if (!res.ok) {
        throw new Error("Failed to update document");
      }

      setEditDocOpen(false);
      setEditingDoc(null);
      fetchDocuments();
    } catch (err: any) {
      alert(err.message || err);
    }
  };

  const handleMoveDocument = async (doc: AppDocument, targetCategory: string) => {
    // Optimistic UI update: instantly update the local state for a smooth feel
    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, category: targetCategory } : d));

    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: doc.title,
          category: targetCategory
        })
      });

      if (!res.ok) {
        throw new Error("Failed to update document category");
      }
    } catch (err: any) {
      console.error("Error moving document category:", err);
      // Revert optimism if error occurs
      fetchDocuments();
      alert("Failed to move document: " + (err.message || err));
    } finally {
      fetchDocuments();
    }
  };

  const getFolderStats = (folderName: string) => {
    const folderDocs = folderName === 'All' 
      ? documents 
      : documents.filter(d => d.category === folderName);

    const count = folderDocs.length;
    let totalBytes = 0;
    folderDocs.forEach(d => {
      if (d.file_size) {
        totalBytes += Math.round(d.file_size * 0.75);
      }
    });

    return { count, totalBytes };
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1000; // Let's use standard decimal KB or binary 1024. Both are fine. 1000 is clean! Let's do standard 1024 for precision.
    const binaryK = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(binaryK));
    return parseFloat((bytes / Math.pow(binaryK, i)).toFixed(1)) + ' ' + sizes[i];
  };

  useEffect(() => {
    fetchDocuments();
    return () => {
      // Cleanup camera on unmount
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [token, cameraStream]);

  const fetchDocuments = () => {
    fetch('/api/documents', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(setDocuments);
  };

  const startCamera = async (deviceId?: string) => {
    setCameraError(null);
    setIsScanningActive(true);
    
    // Stop any existing stream tracks first
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId } } 
          : { facingMode: { ideal: 'environment' } } // prefer back camera
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          console.error("Video play failed:", err);
        });
      }

      // Enumerate cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoIns = devices.filter(d => d.kind === 'videoinput');
      setCameras(videoIns);
      
      const activeTrack = stream.getVideoTracks()[0];
      if (activeTrack) {
        const settings = activeTrack.getSettings();
        if (settings.deviceId) {
          setActiveCameraId(settings.deviceId);
        }
      }
    } catch (err: any) {
      console.error("Camera connection failed:", err);
      setCameraError(
        err.name === 'NotAllowedError' 
          ? "Permission denied. Please grant camera access in your browser settings to scan documents." 
          : `Could not access camera: ${err.message || 'Unknown error'}`
      );
    } finally {
      setIsScanningActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const openScanner = () => {
    setScannerOpen(true);
    setScanPreviewImage(null);
    setScanFilter('original');
    setScanTitle(title || `Scan_${new Date().toISOString().split('T')[0]}`);
    setScanCategory(category);
    // Mini timeout to let videoRef element attach to DOM first
    setTimeout(() => {
      startCamera();
    }, 150);
  };

  const closeScanner = () => {
    stopCamera();
    setScannerOpen(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(video, 0, 0, w, h);

    const rawBase64 = canvas.toDataURL('image/jpeg', 0.90);
    setScanPreviewImage(rawBase64);
    stopCamera();
  };

  const handleSaveScannedDoc = async () => {
    if (!scanPreviewImage) return;

    setIsUploading(true);
    try {
      let finalBase64 = scanPreviewImage;
      
      if (scanFilter !== 'original') {
        finalBase64 = await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) {
              resolve(scanPreviewImage);
              return;
            }
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            
            if (scanFilter === 'grayscale') {
              tempCtx.filter = 'grayscale(100%)';
            } else if (scanFilter === 'contrast') {
              tempCtx.filter = 'grayscale(100%) contrast(170%) brightness(110%)';
            }
            
            tempCtx.drawImage(img, 0, 0);
            resolve(tempCanvas.toDataURL('image/jpeg', 0.90));
          };
          img.onerror = () => resolve(scanPreviewImage);
          img.src = scanPreviewImage;
        });
      }

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          title: scanTitle || 'Scanned Document',
          category: scanCategory,
          file_name: `${scanTitle.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}.jpg`,
          file_type: 'image/jpeg',
          file_data: finalBase64
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      closeScanner();
      fetchDocuments();
    } catch (err: any) {
      alert(`Scanner save error: ${err.message || err}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        
        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({
            title: title || file.name,
            category,
            file_name: file.name,
            file_type: file.type,
            file_data: base64
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }

        setTitle('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchDocuments();
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadDocument = async (id: string, fileName: string) => {
    try {
      const res = await fetch(`/api/documents/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to download");
      const data = await res.json();
      
      const a = document.createElement('a');
      a.href = data.file_data;
      a.download = data.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const deleteDocument = (doc: AppDocument) => {
    setDocumentToDelete(doc);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteDocument = async () => {
    if (!documentToDelete) return;
    try {
      await fetch(`/api/documents/${documentToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDocuments();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleteConfirmOpen(false);
      setDocumentToDelete(null);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <FileImage size={24} className="opacity-60" />;
    if (type.includes('pdf')) return <FileText size={24} className="opacity-60" />;
    if (type.includes('zip') || type.includes('tar') || type.includes('rar')) return <FileArchive size={24} className="opacity-60" />;
    return <File size={24} className="opacity-60" />;
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'ID': return 'Identification';
      case 'Court': return 'Court Documents';
      case 'Resume': return 'Resume / CV';
      case 'Certificate': return 'Certificates';
      case 'Other': return 'Other';
      default: return cat;
    }
  };

  const standardCategories = ['ID', 'Court', 'Resume', 'Certificate'];
  
  // Auto-detect extra category strings in the document list that aren't standard or in custom list
  const discoveredCategories: string[] = [];
  documents.forEach(doc => {
    if (doc.category && 
        !standardCategories.includes(doc.category) && 
        !customCategories.includes(doc.category) && 
        doc.category !== 'Other' &&
        !discoveredCategories.includes(doc.category)) {
      discoveredCategories.push(doc.category);
    }
  });

  const allFolders = [
    ...standardCategories,
    ...customCategories,
    ...discoveredCategories,
    'Other'
  ];

  const filteredDocuments = filterCategory === 'All' 
    ? documents 
    : documents.filter(doc => doc.category === filterCategory);

  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <h2 className="text-6xl font-serif italic tracking-tighter">The Vault</h2>
        <p className="text-xl opacity-60 max-w-2xl">
          Securely store and access your important documents: IDs, court records, resumes, and certificates.
        </p>
      </header>

      <div className="bg-white border border-[#141414] p-6">
        <h3 className="text-xl font-serif italic mb-4">Upload Document</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs uppercase tracking-widest font-bold mb-1">Title (Optional)</label>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. State ID"
              className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest font-bold mb-1">Category / Folder</label>
            <select 
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10 bg-white font-bold"
            >
              {allFolders.map(folder => (
                <option key={folder} value={folder}>
                  {getCategoryLabel(folder)}
                </option>
              ))}
            </select>
          </div>
                  <div className="flex items-end">
            <div className="grid grid-cols-2 gap-2 w-full">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label 
                htmlFor="file-upload"
                className={`flex items-center justify-center gap-2 p-3 uppercase tracking-widest text-[10px] font-bold transition-colors cursor-pointer text-center h-12 border border-[#141414] ${
                  isUploading ? 'bg-[#141414]/50 border-transparent text-[#E4E3E0] cursor-not-allowed' : 'bg-white text-[#141414] hover:bg-[#141414]/5'
                }`}
              >
                <Upload size={14} /> {isUploading ? 'Uploading...' : 'Upload File'}
              </label>

              <button
                type="button"
                onClick={openScanner}
                className="flex items-center justify-center gap-2 p-3 uppercase tracking-widest text-[10px] font-bold transition-colors cursor-pointer text-center h-12 bg-[#141414] text-[#E4E3E0] border border-[#141414] hover:opacity-90"
              >
                <Camera size={14} /> Scan Paper
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs opacity-60">Max file size: 10MB. Files are stored securely.</p>
      </div>

      {/* Visual Folders Panel */}
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-[#141414]/10">
          <label className="text-xs uppercase tracking-widest font-bold text-[#141414]">Folders & Categories</label>
          <span className="text-[10px] text-gray-500 font-mono">Click folder to filter documents</span>
        </div>
        <div id="folder-list-container" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          
          {/* 'All' Folder card */}
          <div 
            onClick={() => setFilterCategory('All')}
            className={`border border-[#141414] p-4 flex flex-col justify-between h-32 select-none cursor-pointer transition-all ${
              filterCategory === 'All' 
                ? 'bg-[#141414] text-[#E4E3E0] shadow-sm transform scale-[1.02]' 
                : 'bg-white text-[#141414] hover:bg-[#141414]/5'
            }`}
          >
            <div className="flex justify-between items-start">
              {filterCategory === 'All' ? <FolderOpen size={24} className="opacity-80" /> : <Folder size={24} className="opacity-65" />}
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                filterCategory === 'All' ? 'bg-white/10 border-white/20' : 'bg-[#141414]/5 border-[#141414]/10'
              }`}>
                {documents.length}
              </span>
            </div>
            <div>
              <h4 className="font-serif italic font-bold">All Documents</h4>
              <p className="text-[9px] uppercase tracking-widest opacity-50 font-mono">Master Vault</p>
            </div>
          </div>

          {/* Map Folders */}
          {allFolders.map(folder => {
            const count = documents.filter(d => d.category === folder).length;
            const isSelected = filterCategory === folder;
            const isCustom = customCategories.includes(folder);
            const isEditing = editingFolderOriginalName === folder;
            const isDragOver = dragOverFolder === folder;
            
            return (
              <div 
                key={folder}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedDoc && draggedDoc.category !== folder) {
                    setDragOverFolder(folder);
                  }
                }}
                onDragLeave={() => {
                  setDragOverFolder(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverFolder(null);
                  if (draggedDoc) {
                    if (draggedDoc.category !== folder) {
                      handleMoveDocument(draggedDoc, folder);
                    }
                  } else {
                    const docId = e.dataTransfer.getData("text/plain");
                    const foundDoc = documents.find(d => d.id === docId);
                    if (foundDoc && foundDoc.category !== folder) {
                      handleMoveDocument(foundDoc, folder);
                    }
                  }
                }}
                className={`border p-4 flex flex-col justify-between h-32 select-none relative group transition-all duration-200 ${
                  isDragOver
                    ? 'border-2 border-dashed border-[#141414] bg-amber-100/90 text-[#141414] scale-105 shadow-md z-10'
                    : isSelected 
                      ? 'border-[#141414] bg-[#141414] text-[#E4E3E0] shadow-sm transform scale-[1.02]' 
                      : 'border-[#141414] bg-white text-[#141414] hover:bg-[#141414]/5'
                }`}
                style={{ cursor: isEditing ? 'default' : 'pointer' }}
                onClick={() => {
                  if (!isEditing) setFilterCategory(folder);
                }}
              >
                <div className="flex justify-between items-start">
                  {isSelected ? <FolderOpen size={24} className="opacity-80" /> : <Folder size={24} className="opacity-65" />}
                  
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {isCustom && !isEditing && (
                      <div className="flex opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity absolute top-2 right-2 gap-1 bg-white border border-[#141414] p-1 shadow-sm rounded">
                        <button
                          onClick={() => {
                            setSelectedFolderInfo(folder);
                          }}
                          className="p-1 hover:bg-gray-100 text-[#141414] rounded transition-colors"
                          title="Folder Storage Info"
                        >
                          <Info size={11} className="text-[#141414]" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingFolderOriginalName(folder);
                            setEditingFolderNameValue(folder);
                          }}
                          className="p-1 hover:bg-gray-100 text-[#141414] rounded transition-colors"
                          title="Rename Folder"
                        >
                          <Edit3 size={11} className="text-[#141414]" />
                        </button>
                        <button
                          onClick={() => handleDeleteFolder(folder)}
                          className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors"
                          title="Delete Folder"
                        >
                          <Trash2 size={11} className="text-red-600" />
                        </button>
                      </div>
                    )}
                    
                    {isCustom && !isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFolderInfo(folder);
                        }}
                        className={`p-1 rounded transition-colors flex items-center justify-center ${
                          isSelected ? 'hover:bg-white/10 text-[#E4E3E0]' : 'hover:bg-[#141414]/5 text-[#141414]'
                        }`}
                        title="Storage Info (Click to view)"
                      >
                        <Info size={11} className="opacity-75" />
                      </button>
                    )}

                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      isSelected ? 'bg-white/10 border-white/20' : 'bg-[#141414]/5 border-[#141414]/10'
                    }`}>
                      {count}
                    </span>
                  </div>
                </div>

                <div>
                  {isEditing ? (
                    <div onClick={e => e.stopPropagation()} className="mt-2 flex gap-1 items-center">
                      <input
                        type="text"
                        value={editingFolderNameValue}
                        onChange={e => setEditingFolderNameValue(e.target.value)}
                        className="w-full text-xs p-1 border border-[#141414] text-black bg-white focus:outline-none font-bold"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameFolder(folder, editingFolderNameValue);
                          if (e.key === 'Escape') setEditingFolderOriginalName(null);
                        }}
                      />
                      <button
                        onClick={() => handleRenameFolder(folder, editingFolderNameValue)}
                        className="p-1 bg-[#141414] text-white border border-[#141414]"
                        title="Save"
                      >
                        <Check size={11} />
                      </button>
                      <button
                        onClick={() => setEditingFolderOriginalName(null)}
                        className="p-1 bg-white text-black border border-[#141414]"
                        title="Cancel"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-serif italic font-bold truncate pr-4">{getCategoryLabel(folder)}</h4>
                      <p className="text-[9px] uppercase tracking-widest opacity-50 font-mono">
                        {isCustom ? 'Custom Folder' : 'System Folder'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Inline New Folder Input/Trigger */}
          {showAddFolderInput ? (
            <form 
              onSubmit={handleCreateFolder}
              onClick={e => e.stopPropagation()}
              className="border border-[#141414] p-4 flex flex-col justify-between h-32 bg-amber-50/40 relative shadow-inner"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase font-bold tracking-widest text-[#141414]/60 font-mono">New Custom Folder</span>
                <button 
                  type="button" 
                  onClick={() => setShowAddFolderInput(false)}
                  className="hover:opacity-75"
                >
                  <X size={14} className="text-[#141414]" />
                </button>
              </div>
              
              <input
                type="text"
                placeholder="Folder name..."
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                className="w-full p-2 border border-[#141414] text-xs focus:ring-1 focus:ring-[#141414] bg-white outline-none font-bold text-[#141414]"
                maxLength={25}
                autoFocus
              />

              <button 
                type="submit"
                className="w-full bg-[#141414] text-[#E4E3E0] uppercase tracking-widest text-[9px] font-bold p-1 hover:opacity-95 text-center mt-1 border border-[#141414]"
              >
                Create Folder
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddFolderInput(true)}
              className="border border-dashed border-[#141414]/40 hover:border-[#141414] p-4 flex flex-col justify-center items-center h-32 bg-[#141414]/2 select-none cursor-pointer transition-all hover:bg-[#141414]/5 group"
            >
              <FolderPlus size={28} className="opacity-40 group-hover:opacity-70 group-hover:scale-105 transition-all mb-2" />
              <span className="text-xs uppercase tracking-widest font-bold opacity-50 group-hover:opacity-85">New Folder</span>
            </button>
          )}

        </div>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
              <FileText size={16} /> Your Documents
            </h3>
            <p className="text-[10px] text-gray-500 font-mono">
              💡 Tip: Click & drag your files directly into any folder above to reorganize
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs uppercase tracking-widest font-bold opacity-60">Filter:</label>
            <select 
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="border border-[#141414] p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#141414]/10 bg-white font-bold"
            >
              <option value="All">All Documents</option>
              {allFolders.map(folder => (
                <option key={folder} value={folder}>
                  {getCategoryLabel(folder)}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {filteredDocuments.length === 0 ? (
          <div className="p-12 border border-[#141414]/20 text-center opacity-60">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p>{documents.length === 0 ? "Your vault is empty. Upload your first document above." : "No documents found in this category."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map(doc => (
              <div 
                key={doc.id} 
                draggable="true"
                onDragStart={(e) => {
                  setDraggedDoc(doc);
                  e.dataTransfer.setData("text/plain", doc.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => {
                  setDraggedDoc(null);
                }}
                className={`bg-white border border-[#141414] p-4 flex flex-col cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-sm ${
                  draggedDoc?.id === doc.id ? 'opacity-40 border-dashed scale-95' : ''
                }`}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-3 bg-[#E4E3E0] rounded-sm">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold truncate" title={doc.title}>{doc.title}</h4>
                    <p className="text-xs opacity-60 truncate" title={doc.file_name}>{doc.file_name}</p>
                    <span className="inline-block mt-1 text-[10px] uppercase tracking-widest bg-[#141414] text-[#E4E3E0] px-2 py-0.5">
                      {getCategoryLabel(doc.category)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-[#141414]/10 flex justify-between items-center">
                  <span className="text-xs opacity-60">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingDoc(doc);
                        setEditTitle(doc.title);
                        setEditCategory(doc.category);
                        setEditDocOpen(true);
                      }}
                      className="p-1.5 hover:bg-[#141414]/5 rounded transition-colors"
                      title="Rename & Move"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      onClick={() => downloadDocument(doc.id, doc.file_name)}
                      className="p-1.5 hover:bg-[#141414]/5 rounded transition-colors"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      onClick={() => deleteDocument(doc)}
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        title="Delete Document"
        message={`Are you sure you want to delete "${documentToDelete?.title}"? This action cannot be undone.`}
        onConfirm={executeDeleteDocument}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setDocumentToDelete(null);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Hidden virtual canvas for image frame storage */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Document Scanner Autopilot Modal */}
      {scannerOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#E4E3E0] text-[#141414] border-2 border-[#141414] w-full max-w-2xl flex flex-col shadow-2xl relative">
            
            {/* Header */}
            <div className="border-b-2 border-[#141414] p-4 flex justify-between items-center bg-[#141414] text-[#E4E3E0]">
              <div className="flex items-center gap-2">
                <Camera size={20} className="text-[#E4E3E0]" />
                <h3 className="font-serif italic font-medium text-lg">Document Camera Scanner</h3>
              </div>
              <button 
                onClick={closeScanner}
                className="p-1 hover:bg-[#E4E3E0]/15 text-[#E4E3E0] rounded transition-colors"
                title="Close Scanner"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error banner if permission/device failed */}
            {cameraError && (
              <div className="bg-red-50 border-b border-red-200 p-4 text-red-700 flex items-start gap-2 text-sm">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Camera Initialization Failed</p>
                  <p className="mt-1 opacity-90">{cameraError}</p>
                  <button 
                    onClick={() => startCamera(activeCameraId)}
                    className="mt-2 text-xs font-bold uppercase tracking-widest underline hover:opacity-80"
                  >
                    Retry Access
                  </button>
                </div>
              </div>
            )}

            {/* Main content body */}
            <div className="p-6 flex-1 overflow-y-auto max-h-[80vh]">
              
              {!scanPreviewImage ? (
                /* LIVE VIEW MODE */
                <div className="space-y-6">
                  <div className="relative aspect-[4/3] bg-black border border-[#141414] overflow-hidden flex items-center justify-center">
                    
                    {/* Live Stream View */}
                    <video 
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover transform [transform:rotateY(0deg)]"
                    />

                    {/* Scanner Framing Overlay/Guide */}
                    <div className="absolute inset-6 border border-white/30 rounded-sm pointer-events-none flex flex-col justify-between p-2">
                      <div className="w-full flex justify-between opacity-80">
                        <div className="w-6 h-6 border-t-2 border-l-2 border-green-400" />
                        <div className="w-6 h-6 border-t-2 border-r-2 border-green-400" />
                      </div>
                      
                      {/* Guidance Box Label */}
                      <p className="text-[10px] text-center font-mono uppercase tracking-widest text-green-400 bg-black/60 px-2 py-1 mx-auto max-w-max rounded">
                        Align physical document
                      </p>

                      <div className="w-full flex justify-between opacity-80">
                        <div className="w-6 h-6 border-b-2 border-l-2 border-green-400" />
                        <div className="w-6 h-6 border-b-2 border-r-2 border-green-400" />
                      </div>
                    </div>

                    {/* Auto Bouncing Laser Scanner Line */}
                    <div className="absolute left-6 right-6 h-0.5 bg-green-500 shadow-[0_0_8px_#22c55e] animate-bounce pointer-events-none" />

                    {/* Mini overlay loader */}
                    {isScanningActive && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[#E4E3E0] gap-2 text-xs uppercase tracking-widest font-bold">
                        <RefreshCw size={16} className="animate-spin" /> Engaging Camera...
                      </div>
                    )}
                  </div>

                  {/* Device selectors & trigger actions */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    
                    {/* Switch camera source */}
                    <div className="w-full sm:w-auto">
                      {cameras.length > 1 ? (
                        <div className="flex items-center gap-2 border border-[#141414] bg-white p-2">
                          <label className="text-[10px] uppercase font-bold tracking-wider opacity-60">Source:</label>
                          <select 
                            value={activeCameraId}
                            onChange={(e) => startCamera(e.target.value)}
                            className="bg-transparent text-xs font-bold focus:outline-none focus:ring-0 max-w-[200px]"
                          >
                            {cameras.map((cam, idx) => (
                              <option key={cam.deviceId} value={cam.deviceId}>
                                {cam.label || `Camera ${idx + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider font-mono opacity-50 bg-[#141414]/5 px-2 py-1 rounded">
                          Standard Camera Connected
                        </span>
                      )}
                    </div>

                    {/* Shutter Capture click */}
                    <button
                      onClick={capturePhoto}
                      disabled={isScanningActive || !!cameraError}
                      className="w-16 h-16 rounded-full border-4 border-[#141414] hover:border-[#141414]/80 flex items-center justify-center bg-white shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                      title="Capture Document"
                    >
                      <span className="w-12 h-12 rounded-full bg-red-600 block hover:bg-red-500 transition-colors" />
                    </button>

                    <div className="w-0 sm:w-32" /> {/* alignment spacer */}
                  </div>
                </div>
              ) : (
                /* REVIEW & APPLY SCANNER FILTERS MODE */
                <div className="space-y-6">
                  
                  {/* Draft image preview layout matching filter choice */}
                  <div className="relative aspect-[4/3] bg-black border border-[#141414] overflow-hidden flex items-center justify-center">
                    <img 
                      src={scanPreviewImage} 
                      alt="Scanned raw document" 
                      className="w-full h-full object-contain transition duration-200"
                      style={{
                        filter: 
                          scanFilter === 'grayscale' ? 'grayscale(100%)' :
                          scanFilter === 'contrast' ? 'grayscale(100%) contrast(180%) brightness(115%)' :
                          'none'
                      }}
                    />
                    
                    <div className="absolute bottom-3 left-3 bg-[#141414]/80 text-[#E4E3E0] px-2 py-1 uppercase text-[9px] font-mono tracking-widest rounded">
                      Captured Preview
                    </div>
                  </div>

                  {/* Filters selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-1">
                      <Sparkles size={12} /> Document Enhancement Filters
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setScanFilter('original')}
                        className={`p-3 text-xs uppercase tracking-wider font-bold border transition-all ${
                          scanFilter === 'original' 
                            ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]' 
                            : 'bg-white border-[#141414]/20 hover:bg-[#141414]/5'
                        }`}
                      >
                        Original
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setScanFilter('grayscale')}
                        className={`p-3 text-xs uppercase tracking-wider font-bold border transition-all ${
                          scanFilter === 'grayscale' 
                            ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]' 
                            : 'bg-white border-[#141414]/20 hover:bg-[#141414]/5'
                        }`}
                      >
                        Photocopy (Grayscale)
                      </button>

                      <button
                        type="button"
                        onClick={() => setScanFilter('contrast')}
                        className={`p-3 text-xs uppercase tracking-wider font-bold border transition-all ${
                          scanFilter === 'contrast' 
                            ? 'bg-[#141414] text-[#E4E3E0] border-[#141414]' 
                            : 'bg-white border-[#141414]/20 hover:bg-[#141414]/5'
                        }`}
                      >
                        Xerox/Doc (Noir Text)
                      </button>
                    </div>
                  </div>

                  {/* Document Title & Category Meta */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#141414]/10 pt-4">
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-bold mb-1">Document Title</label>
                      <input 
                        type="text" 
                        value={scanTitle}
                        onChange={e => setScanTitle(e.target.value)}
                        placeholder="e.g. Scanned Birth Certificate"
                        className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10 bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-bold mb-1">Vault Category</label>
                      <select 
                        value={scanCategory}
                        onChange={e => setScanCategory(e.target.value)}
                        className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10 bg-white font-bold"
                      >
                        {allFolders.map(folder => (
                          <option key={folder} value={folder}>
                            {getCategoryLabel(folder)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-[#141414]/10">
                    <button
                      type="button"
                      onClick={() => {
                        setScanPreviewImage(null);
                        startCamera(activeCameraId);
                      }}
                      className="px-6 py-3 uppercase tracking-widest text-[11px] font-bold bg-white text-[#141414] border border-[#141414] hover:bg-[#141414]/5 flex items-center gap-1.5"
                    >
                      Re-take Photo
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveScannedDoc}
                      disabled={isUploading}
                      className="px-8 py-3 bg-[#141414] text-[#E4E3E0] hover:opacity-90 transition-opacity uppercase tracking-widest text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Processing...
                        </>
                      ) : (
                        <>
                          <Check size={14} /> Save to Vault
                        </>
                      )}
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {editDocOpen && editingDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#E4E3E0] text-[#141414] border-2 border-[#141414] w-full max-w-sm p-6 shadow-2xl relative">
            <button 
              onClick={() => {
                setEditDocOpen(false);
                setEditingDoc(null);
              }}
              className="absolute top-4 right-4 p-1 hover:bg-[#141414]/5 transition-colors rounded text-[#141414]"
              title="Close"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-2xl font-serif italic mb-6 text-[#141414]">Rename / Move Document</h3>
            
            <form onSubmit={handleSaveEditDoc} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold mb-1 text-[#141414]/80">Document Title</label>
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10 bg-white font-bold text-[#141414]"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs uppercase tracking-widest font-bold mb-1 text-[#141414]/80">Move to Folder / Category</label>
                <select 
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  className="w-full border border-[#141414] p-3 focus:outline-none focus:ring-2 focus:ring-[#141414]/10 bg-white font-bold text-[#141414]"
                >
                  {allFolders.map(folder => (
                    <option key={folder} value={folder}>
                      {getCategoryLabel(folder)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 justify-end pt-4 border-t border-[#141414]/10 mt-6 md:mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditDocOpen(false);
                    setEditingDoc(null);
                  }}
                  className="px-6 py-2 uppercase tracking-widest text-[10px] font-bold bg-white text-[#141414] border border-[#141414] hover:bg-[#141414]/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2 bg-[#141414] text-[#E4E3E0] hover:opacity-90 uppercase tracking-widest text-[10px] font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Folder Storage Info Modal */}
      {selectedFolderInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#E4E3E0] text-[#141414] border-2 border-[#141414] w-full max-w-sm p-6 shadow-2xl relative animate-in fade-in duration-200">
            <button 
              onClick={() => setSelectedFolderInfo(null)}
              className="absolute top-4 right-4 p-1 hover:bg-[#141414]/5 transition-colors rounded text-[#141414]"
              title="Close"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3 mb-4 pr-6">
              <FolderOpen size={28} className="text-[#141414] opacity-80 shrink-0" />
              <h3 className="text-2xl font-serif italic text-[#141414] truncate">{getCategoryLabel(selectedFolderInfo)}</h3>
            </div>
            
            <p className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-6 font-mono">Folder Storage Metrics</p>

            <div className="space-y-4 border-t border-b border-[#141414]/10 py-6 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Number of Files:</span>
                <span className="font-mono font-bold text-lg">{getFolderStats(selectedFolderInfo).count}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Storage Size:</span>
                <span className="font-mono font-bold text-lg text-emerald-800">
                  {formatBytes(getFolderStats(selectedFolderInfo).totalBytes)}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedFolderInfo(null)}
                className="w-full sm:w-auto px-8 py-2 bg-[#141414] text-[#E4E3E0] hover:opacity-90 uppercase tracking-widest text-[10px] font-bold border border-[#141414]"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
