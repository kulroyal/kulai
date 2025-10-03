
import React, { useState, useCallback, useEffect, useReducer } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

// =================================================================================
// ERROR SCREEN COMPONENT
// =================================================================================

const ApiKeyErrorScreen: React.FC = () => {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-200 p-8">
        <div className="w-full max-w-2xl bg-gray-800 border border-red-500/50 rounded-xl p-8 text-center shadow-2xl">
          <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-red-300">Lỗi Cấu Hình API Key</h1>
          <p className="text-gray-400 mt-4">
            Ứng dụng không thể khởi động vì không tìm thấy Google Gemini API Key. Điều này thường xảy ra khi triển khai lên GitHub Pages và cấu hình "Secret" chưa chính xác.
          </p>
          <div className="mt-8 text-left bg-gray-900/50 p-6 rounded-lg border border-gray-700">
            <h2 className="text-lg font-semibold text-indigo-300 mb-3">Hướng dẫn khắc phục sự cố</h2>
            <ol className="list-decimal list-inside space-y-3 text-gray-300 text-sm">
              <li>Đi đến repository GitHub của bạn, vào tab <strong>Settings</strong>.</li>
              <li>Ở menu bên trái, chọn <strong>Secrets and variables {'>'} Actions</strong>.</li>
              <li>Kiểm tra "Repository secrets":
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-gray-400">
                    <li>Tên của secret <strong>PHẢI</strong> là <code className="bg-gray-700 text-amber-300 px-1 py-0.5 rounded">GEMINI_API_KEY</code>.</li>
                    <li>Giá trị của nó <strong>PHẢI</strong> là API key hợp lệ của bạn (không có khoảng trắng thừa).</li>
                </ul>
              </li>
              <li>Nếu secret đã đúng, hãy vào tab <strong>Actions</strong>, chọn workflow <strong>"Deploy to GitHub Pages"</strong> và nhấn <strong>"Run workflow"</strong> để triển khai lại ứng dụng với key mới.</li>
            </ol>
          </div>
          <p className="text-xs text-gray-500 mt-6">
            Nếu bạn đã làm theo các bước trên mà vẫn gặp lỗi, vui lòng kiểm tra lại giá trị API key.
          </p>
        </div>
      </div>
    );
};


// =================================================================================
// TYPES
// =================================================================================

interface ExtractedPose {
    location: string;
    scale: string;
    angle: string;
    lighting: string;
}

interface ImageFile {
    id: string;
    originalFile: File;
    previewUrl: string;
    pose?: string; // For background-specific poses
    extractedPose?: ExtractedPose; // AI-extracted pose/location from the original background
}

interface GeneratedImage {
    id:string;
    src: string; // base64 data URL, empty for failed images
    sourceBackgroundId: string;
    status: 'success' | 'failed';
    error?: string;
}

enum ArtStyle {
    PHOTOGRAPHIC = 'Nhiếp ảnh',
    ANIME = 'Anime',
    OIL_PAINTING = 'Tranh sơn dầu',
    WATERCOLOR = 'Tranh màu nước',
    PIXEL_ART = 'Nghệ thuật Pixel',
    CYBERPUNK = 'Cyberpunk',
}

enum OutputQuality {
    DEFAULT = 'Mặc định',
    FOUR_K = '4K',
    EIGHT_K = '8K',
}

interface CharacterProfile {
    gender: string;
    age: number;
    height: string;
    weight: string;
    build: string;
}

interface ArtDirection {
    pose: string;
    style: ArtStyle;
    quality: OutputQuality;
    additionalPrompt: string;
    preserveFace: boolean;
    autoCleanBackgrounds: boolean;
    expression: string;
    idStrictness: number; // 0-100
}

interface Settings {
    outfitColor: string;
    useOriginalOutfitColor: boolean;
    characterProfile: CharacterProfile;
    artDirection: ArtDirection;
}

interface GenerationProgress {
    current: number;
    total: number;
    step: string;
}

interface AIGeneratedPrompts {
    face: string | null;
    outfit: string | null;
}

interface UserProvidedPrompts {
    face: string;
    outfit: string;
}

interface AppState {
    backgrounds: ImageFile[];
    referenceFace: ImageFile | null;
    additionalFaces: ImageFile[];
    outfit: ImageFile | null;
    settings: Settings;
    generatedImages: GeneratedImage[];
    isGenerating: boolean;
    generationProgress: GenerationProgress;
    error: string | null;
    isolatedSubjectSrc: string | null;
    quickCompositeBackground: ImageFile | null;
    isQuickCompositing: boolean;
    aiGeneratedPrompts: AIGeneratedPrompts;
    userProvidedPrompts: UserProvidedPrompts;
}

type Action =
  | { type: 'UPDATE_SETTINGS'; payload: { key: keyof Settings; value: Settings[keyof Settings] } }
  | { type: 'ADD_IMAGE_FILES'; payload: { type: 'backgrounds' | 'referenceFace' | 'additionalFaces' | 'outfit' | 'quickCompositeBackground'; files: ImageFile[] } }
  | { type: 'REMOVE_IMAGE_FILE'; payload: { type: keyof AppState; id: string } }
  | { type: 'UPDATE_BACKGROUND_POSE'; payload: { id: string; pose: string } }
  | { type: 'REPLACE_BACKGROUND'; payload: { id: string; newFile: ImageFile } }
  | { type: 'START_GENERATION'; payload: { total: number } }
  | { type: 'UPDATE_PROGRESS'; payload: { current: number; step: string } }
  | { type: 'ADD_GENERATED_IMAGES'; payload: GeneratedImage[] }
  | { type: 'FINISH_GENERATION'; }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_ISOLATED_SUBJECT'; payload: string | null }
  | { type: 'SET_QUICK_COMPOSITING'; payload: boolean }
  | { type: 'REPLACE_QUICK_COMPOSITE_BACKGROUND'; payload: ImageFile }
  | { type: 'SET_AI_GENERATED_PROMPT'; payload: { key: 'face' | 'outfit'; prompt: string | null } }
  | { type: 'SET_USER_PROVIDED_PROMPT'; payload: { key: 'face' | 'outfit'; prompt: string } };


// =================================================================================
// APP REDUCER
// =================================================================================

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'UPDATE_SETTINGS':
        // A bit of type magic to handle nested settings like artDirection
        if (typeof action.payload.value === 'object' && !Array.isArray(action.payload.value) && action.payload.value !== null) {
             return { ...state, settings: { ...state.settings, [action.payload.key]: { ...state.settings[action.payload.key] as object, ...action.payload.value } } };
        }
        return { ...state, settings: { ...state.settings, [action.payload.key]: action.payload.value } };
    case 'ADD_IMAGE_FILES':
      if (action.payload.type === 'referenceFace' || action.payload.type === 'outfit' || action.payload.type === 'quickCompositeBackground') {
        return { ...state, [action.payload.type]: action.payload.files[0] || null };
      }
      const currentImages = state[action.payload.type] as ImageFile[];
      return { ...state, [action.payload.type]: [...currentImages, ...action.payload.files] };
    case 'REMOVE_IMAGE_FILE':
      if (action.payload.type === 'referenceFace' || action.payload.type === 'outfit' || action.payload.type === 'quickCompositeBackground') {
        return { ...state, [action.payload.type]: null };
      }
      const images = state[action.payload.type] as ImageFile[];
      return { ...state, [action.payload.type]: images.filter(img => img.id !== action.payload.id) };
    case 'UPDATE_BACKGROUND_POSE':
      return {
        ...state,
        backgrounds: state.backgrounds.map(bg => bg.id === action.payload.id ? { ...bg, pose: action.payload.pose } : bg),
      };
    case 'REPLACE_BACKGROUND':
      return {
        ...state,
        backgrounds: state.backgrounds.map(bg => bg.id === action.payload.id ? action.payload.newFile : bg),
      };
    case 'START_GENERATION':
      return {
        ...state,
        isGenerating: true,
        generationProgress: { current: 0, total: action.payload.total, step: 'Bắt đầu...' },
        generatedImages: [],
        error: null,
        aiGeneratedPrompts: { face: null, outfit: null },
      };
    case 'UPDATE_PROGRESS':
      return { ...state, generationProgress: { ...state.generationProgress, current: action.payload.current, step: action.payload.step } };
    case 'ADD_GENERATED_IMAGES':
        return { ...state, generatedImages: [...state.generatedImages, ...action.payload] };
    case 'FINISH_GENERATION':
      return { ...state, isGenerating: false, generationProgress: { ...state.generationProgress, step: 'Hoàn tất!' } };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isGenerating: false, isQuickCompositing: false };
    case 'SET_ISOLATED_SUBJECT':
        return { ...state, isolatedSubjectSrc: action.payload };
    case 'SET_QUICK_COMPOSITING':
        return { ...state, isQuickCompositing: action.payload, error: null };
    case 'REPLACE_QUICK_COMPOSITE_BACKGROUND':
        return { ...state, quickCompositeBackground: action.payload };
    case 'SET_AI_GENERATED_PROMPT':
        return { ...state, aiGeneratedPrompts: { ...state.aiGeneratedPrompts, [action.payload.key]: action.payload.prompt } };
    case 'SET_USER_PROVIDED_PROMPT':
        return { ...state, userProvidedPrompts: { ...state.userProvidedPrompts, [action.payload.key]: action.payload.prompt } };
    default:
      return state;
  }
};

// =================================================================================
// IMAGE SERVICE
// =================================================================================

const createImagePreview = (file: File, maxWidth: number = 200, maxHeight: number = 200): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg'));
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Remove "data:image/jpeg;base64," prefix
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
            URL.revokeObjectURL(img.src);
        };
        img.onerror = () => {
            reject(new Error("Không thể tải ảnh để lấy kích thước."));
            URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(file);
    });
};


// =================================================================================
// GEMINI SERVICE
// =================================================================================

const parseApiError = (error: any, context: string): Error => {
    if (error.error) { // This is likely a Google API error object
        const apiError = error.error;
        if (apiError.code === 400 && apiError.message?.includes('API key not valid')) {
             return new Error(`API Key không hợp lệ. Vui lòng kiểm tra lại.`);
        }
        if (apiError.code === 429) {
            return new Error(`${context}: Bạn đã vượt quá giới hạn yêu cầu API. Vui lòng kiểm tra gói cước và chi tiết thanh toán của bạn hoặc thử lại sau.`);
        }
        return new Error(`${context}: Lỗi API - ${apiError.message} (Code: ${apiError.code})`);
    }
    if (error instanceof Error) {
        return error;
    }
    return new Error(`${context}: Đã xảy ra lỗi không xác định. Vui lòng kiểm tra console để biết thêm chi tiết.`);
};


// Helper function for robustly parsing the API response
const extractImageFromResponse = (response: GenerateContentResponse, errorContext: string): string => {
    try {
        const candidate = response.candidates?.[0];

        // Case 1: Response was blocked or is empty
        if (!candidate) {
            const blockReason = response.promptFeedback?.blockReason;
            if (blockReason) {
                throw new Error(`Yêu cầu bị chặn với lý do: ${blockReason}.`);
            }
            throw new Error(`API trả về phản hồi trống.`);
        }

        // Case 2: Successful response with an image
        const imagePart = candidate.content.parts.find(p => p.inlineData);
        if (imagePart && imagePart.inlineData) {
            const base64ImageBytes: string = imagePart.inlineData.data;
            return `data:${imagePart.inlineData.mimeType};base64,${base64ImageBytes}`;
        }

        // Case 3: Response with text explanation instead of image
        const textPart = candidate.content.parts.find(p => p.text);
        if (textPart && textPart.text) {
            throw new Error(`AI đã trả về văn bản thay vì hình ảnh: "${textPart.text}"`);
        }
        
        // Fallback error
        throw new Error(`API không trả về một hình ảnh trong phản hồi, mặc dù phản hồi hợp lệ.`);
    } catch (e) {
        // Prepend context to any error thrown
        throw new Error(`${errorContext}: ${e instanceof Error ? e.message : String(e)}`);
    }
};

/**
 * WORKFLOW STEP 1a: Analyze face images and generate a supplementary text description.
 */
const describeFace = async (ai: GoogleGenAI, referenceFace: ImageFile, additionalFaces: ImageFile[]): Promise<string> => {
    try {
        const faceBase64 = await fileToBase64(referenceFace.originalFile);
        const additionalFacesPromises = additionalFaces.map(f => fileToBase64(f.originalFile));
        const additionalFacesBase64 = await Promise.all(additionalFacesPromises);

        const prompt = `**Nhiệm vụ:** Phân tích các ảnh được cung cấp để tạo một bản mô tả văn bản **bổ sung**. Bản mô tả này sẽ được dùng CÙNG VỚI ảnh gốc để hướng dẫn AI.

**PHẦN 1: ĐẶC ĐIỂM QUAN SÁT**
- Mô tả ngắn gọn các đặc điểm chính bạn thấy: Hình dạng khuôn mặt, màu mắt, kiểu tóc.

**PHẦN 2: DẢI CẢM XÚC (EMOTIONAL RANGE)**
- Dựa vào tất cả các ảnh, hãy mô tả cách các đặc điểm trên thay đổi để biểu lộ cảm xúc (cười, buồn, v.v.). Đây là phần quan trọng nhất.

**QUY TẮC TUYỆT ĐỐI:**
1.  **CHỈ TẬP TRUNG VÀO KHUÔN MẶT:** Hoàn toàn bỏ qua quần áo, phụ kiện, và phông nền.
2.  **KẾT QUẢ:** Đầu ra là một đoạn văn bản mô tả thuần túy, tập trung vào dải cảm xúc.`;

        const parts: any[] = [
            { text: prompt },
            { text: "khuôn mặt tham khảo chính:" },
            { inlineData: { data: faceBase64, mimeType: referenceFace.originalFile.type } }
        ];

        additionalFacesBase64.forEach((faceData, index) => {
            parts.push({ text: `khuôn mặt bổ sung ${index + 1} (để phân tích cảm xúc):` });
            parts.push({ inlineData: { data: faceData, mimeType: additionalFaces[index].originalFile.type } });
        });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
        });

        if (!response.text) {
            throw new Error("AI không thể tạo mô tả cho khuôn mặt.");
        }
        return response.text;

    } catch (error) {
        throw parseApiError(error, "Lỗi Bước 1a (Phân tích khuôn mặt)");
    }
};

/**
 * WORKFLOW STEP 1b: Analyze outfit image and generate a text description.
 */
const describeOutfit = async (ai: GoogleGenAI, outfit: ImageFile, useOriginalOutfitColor: boolean, outfitColor: string): Promise<string> => {
    try {
        const outfitBase64 = await fileToBase64(outfit.originalFile);

        const colorInstructionText = useOriginalOutfitColor
            ? "Giữ nguyên màu sắc gốc của trang phục trong ảnh."
            : `Thay đổi màu sắc chủ đạo của trang phục thành mã hex: ${outfitColor}.`;
        
        const prompt = `**Nhiệm vụ:** Phân tích hình ảnh trang phục được cung cấp và tạo ra một mô tả văn bản chi tiết về nó.

**QUY TẮC TUYỆT ĐỐI:**
1.  **CHỈ MÔ TẢ TRANG PHỤC:** Tập trung hoàn toàn vào các đặc điểm của quần áo:
    *   **Loại:** Áo sơ mi, váy, quần, áo khoác, v.v.
    *   **Kiểu dáng:** Dáng ôm, dáng rộng, dài, ngắn, v.v.
    *   **Chất liệu:** Vải cotton, lụa, denim, len, v.v.
    *   **Họa tiết:** Trơn, kẻ sọc, hoa, v.v.
    *   **Chi tiết:** Cổ áo, tay áo, khuy, khóa kéo, v.v.
2.  **Màu sắc:** ${colorInstructionText}
3.  **NGHIÊM CẤM MÔ TẢ BẤT CỨ THỨ GÌ KHÁC:** TUYỆT ĐỐI không đề cập đến người hoặc ma-nơ-canh đang mặc, tư thế, hoặc phông nền trong ảnh.
        
Kết quả đầu ra phải là một đoạn văn bản mô tả thuần túy.`;

        const parts = [
            { text: prompt },
            { inlineData: { data: outfitBase64, mimeType: outfit.originalFile.type } }
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
        });

        if (!response.text) {
            throw new Error("AI không thể tạo mô tả cho trang phục.");
        }
        return response.text;
    } catch (error) {
        throw parseApiError(error, "Lỗi Bước 1b (Phân tích trang phục)");
    }
};

/**
 * WORKFLOW STEP 2: Create a master subject, prioritizing the reference image.
 */
const createMasterSubject = async (
    ai: GoogleGenAI,
    faceDescription: string,
    outfitDescription: string,
    profile: CharacterProfile,
    artDirection: ArtDirection,
    referenceFace: ImageFile | null,
    additionalFaces: ImageFile[]
): Promise<string> => {
    try {
        const parts: any[] = [];
        let prompt: string;

        const strictnessPrompt = (strictness: number): { title: string; rule: string } => {
            if (strictness > 85) return { title: "SAO CHÉP CHÍNH XÁC TUYỆT ĐỐI", rule: "Khuôn mặt của nhân vật bạn tạo ra PHẢI LÀ BẢN SAO CHÍNH XÁC 100% của người trong ảnh. Mọi đặc điểm - mắt, mũi, miệng, cấu trúc hàm, tóc - phải khớp 100%." };
            if (strictness > 60) return { title: "SAO CHÉP CHÍNH XÁC", rule: "Khuôn mặt phải RẤT GIỐNG với ảnh tham khảo, giữ nguyên các đặc điểm nhận dạng chính." };
            if (strictness > 30) return { title: "GIỮ NGUYÊN ĐẶC ĐIỂM CHÍNH", rule: "Giữ lại các đặc điểm chính của khuôn mặt, có thể có một chút thay đổi nhỏ để phù hợp với phong cách." };
            return { title: "LẤY CẢM HỨNG", rule: "Sử dụng khuôn mặt tham khảo làm nguồn cảm hứng, cho phép diễn giải nghệ thuật." };
        };
        const idDirectives = strictnessPrompt(artDirection.idStrictness);

        if (referenceFace) {
            prompt = `**Nhiệm vụ cốt lõi: Tạo một 'nhân vật chủ thể' hoàn chỉnh, kết hợp thông tin từ ảnh và văn bản.**
Sự nhất quán và sao chép chính xác khuôn mặt từ ảnh tham khảo là YÊU CẦU QUAN TRỌNG NHẤT.

**1. Hướng dẫn về Khuôn mặt (${idDirectives.title}):**
- **NGUỒN GỐC DUY NHẤT:** Sử dụng **'ảnh khuôn mặt tham khảo chính'** được cung cấp làm nguồn tham chiếu tuyệt đối.
- **QUY TẮC:** ${idDirectives.rule}
- **VAI TRÒ CỦA VĂN BẢN:** Mô tả văn bản ("${faceDescription}") chỉ dùng để bổ sung, giúp bạn hiểu rõ hơn các chi tiết, nhưng nếu có mâu thuẫn, **HÌNH ẢNH LUÔN LUÔN THẮNG.**
- **ẢNH BỔ SUNG:** Các 'ảnh mặt bổ sung' được cung cấp để bạn hiểu dải cảm xúc của nhân vật, không dùng để thay đổi nhận dạng gốc.

**2. Hướng dẫn về Vóc dáng:**
- Tạo hình thể *chỉ* dựa trên các thông số văn bản sau: Giới tính: ${profile.gender}, Tuổi: ${profile.age}, Chiều cao: ${profile.height}, Cân nặng: ${profile.weight}, Dáng người: ${profile.build}.

**3. Hướng dẫn về Trang phục:**
- Nhân vật phải mặc trang phục khớp chính xác 100% với mô tả sau: "${outfitDescription}".

**4. Hướng dẫn về Bố cục:**
- **Tư thế:** Đứng thẳng tự nhiên, nhìn về phía trước.
- **Biểu cảm:** TRUNG TÍNH (neutral).
- **Nền:** Nền màu xám trơn, trung tính (#808080).
- **Phong cách nghệ thuật:** '${artDirection.style}'.`;

            parts.push({ text: prompt });
            
            const faceBase64 = await fileToBase64(referenceFace.originalFile);
            parts.push({ text: "ảnh khuôn mặt tham khảo chính:" });
            parts.push({ inlineData: { data: faceBase64, mimeType: referenceFace.originalFile.type } });

            const additionalFacesPromises = additionalFaces.map(f => fileToBase64(f.originalFile));
            const additionalFacesBase64 = await Promise.all(additionalFacesPromises);
            additionalFacesBase64.forEach((faceData, index) => {
                parts.push({ text: `ảnh mặt bổ sung ${index + 1}:` });
                parts.push({ inlineData: { data: faceData, mimeType: additionalFaces[index].originalFile.type } });
            });
        } else {
            // Fallback for text-only prompt
            prompt = `**Nhiệm vụ cốt lõi: Tạo một 'nhân vật chủ thể' hoàn chỉnh dựa trên các mô tả văn bản sau đây.**
- **Khuôn mặt & Tóc (${idDirectives.title}):** ${idDirectives.rule} Mô tả: "${faceDescription}".
- **Vóc dáng:** Tạo hình thể *chỉ* dựa trên các thông số sau: Giới tính: ${profile.gender}, Tuổi: ${profile.age}, Chiều cao: ${profile.height}, Cân nặng: ${profile.weight}, Dáng người: ${profile.build}.
- **Trang phục:** Nhân vật phải mặc trang phục khớp chính xác 100% với mô tả sau: "${outfitDescription}".
- **Bố cục:** Tư thế đứng thẳng, biểu cảm TRUNG TÍNH, trên nền màu xám trơn (#808080).
- **Phong cách nghệ thuật:** '${artDirection.style}'.`;
            parts.push({ text: prompt });
        }
        
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        return extractImageFromResponse(response, "Lỗi Bước 2 (Tạo chủ thể)");
    } catch (error) {
        throw parseApiError(error, "Lỗi Bước 2 (Tạo chủ thể)");
    }
};


/**
 * WORKFLOW STEP 3: Isolate the subject by removing the neutral background.
 */
const isolateSubject = async (ai: GoogleGenAI, subjectImageSrc: string): Promise<string> => {
    try {
        const base64Data = subjectImageSrc.split(',')[1];
        const mimeType = subjectImageSrc.match(/data:(.*);base64/)?.[1] || 'image/png';

        const prompt = "Remove the background from this image completely. The output must be the person with a transparent background. Do not add any shadows.";

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }, { inlineData: { data: base64Data, mimeType } }],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        return extractImageFromResponse(response, "Lỗi Bước 3 (Tách nền)");
    } catch (error) {
        throw parseApiError(error, "Lỗi Bước 3 (Tách nền)");
    }
};

/**
 * WORKFLOW STEP 4: Composite the isolated subject into a scene.
 */
const compositeSubjectIntoScene = async (
    ai: GoogleGenAI,
    isolatedSubjectSrc: string,
    backgroundFile: File,
    artDirection: ArtDirection,
    referenceFace: ImageFile | null,
    backgroundWidth: number,
    backgroundHeight: number,
    extractedPose?: ExtractedPose,
): Promise<string> => {
    try {
        const subjectBase64 = isolatedSubjectSrc.split(',')[1];
        const subjectMimeType = isolatedSubjectSrc.match(/data:(.*);base64/)?.[1] || 'image/png';
        const backgroundBase64 = await fileToBase64(backgroundFile);

        const strictnessPrompt = (strictness: number): { core: string; face: string } => {
            if (strictness > 85) return { core: "BẢO TOÀN TUYỆT ĐỐI NHẬN DẠNG (YÊU CẦU NGHIÊM NGẶT NHẤT)", face: "Khuôn mặt PHẢI LÀ BẢN SAO CHÍNH XÁC 100%, không được phép có bất kỳ sai lệch nào." };
            if (strictness > 60) return { core: "Bảo toàn nhận dạng (NGHIÊM NGẶT)", face: "Khuôn mặt phải RẤT GIỐNG với ảnh tham khảo. Hạn chế tối đa sự sáng tạo." };
            if (strictness > 30) return { core: "Bảo toàn nhận dạng", face: "Giữ lại các đặc điểm chính của khuôn mặt, có thể có một chút thay đổi nhỏ về biểu cảm." };
            return { core: "Lấy cảm hứng từ nhận dạng", face: "Sử dụng khuôn mặt tham khảo làm nguồn cảm hứng, cho phép diễn giải nghệ thuật." };
        };
        const idDirectives = strictnessPrompt(artDirection.idStrictness);
        
        const locationInstruction = extractedPose
            ? `**2. Vị trí & Tỷ lệ (YÊU CẦU QUAN TRỌNG NHẤT):**
- **VỊ TRÍ:** Đặt chủ thể vào vị trí sau: "${extractedPose.location}".
- **TỶ LỆ:** Điều chỉnh kích thước chủ thể để khớp với mô tả: "${extractedPose.scale}". Việc này CỰC KỲ QUAN TRỌNG để có phối cảnh đúng.
- **GÓC ĐỘ & TƯƠNG TÁC:** Chủ thể phải có góc độ "${extractedPose.angle}" và tương tác tự nhiên với vị trí được chỉ định.`
            : `**2. Điều chỉnh tư thế:** Thay đổi tư thế của chủ thể để họ tương tác một cách tự nhiên và hợp lý với môi trường trong 'bối cảnh'. Chủ đề chung cho tư thế/hành động là: "${artDirection.pose}".`;

        const lightingInstruction = extractedPose?.lighting
            ? `**4. Hòa hợp Ánh sáng & Môi trường (QUAN TRỌNG):**
- **NGUỒN SÁNG:** Môi trường có ánh sáng được mô tả là "${extractedPose.lighting}". Điều chỉnh ánh sáng trên chủ thể để khớp với nguồn sáng này.
- **BÓNG ĐỔ:** Tạo bóng đổ (contact shadows) thực tế nơi chủ thể tiếp xúc với mặt đất/vật thể.
- **HÒA MÀU:** Tinh chỉnh cân bằng trắng và độ tương phản của chủ thể để khớp với 'bối cảnh'.
- **HIỆU ỨNG ỐNG KÍNH:** Thêm nhiễu (grain), vignette, và quang sai màu (chromatic aberration) rất nhẹ để chủ thể hòa nhập hoàn toàn vào ảnh nền.`
            : `**4. Hòa hợp Ánh sáng:** Điều chỉnh ánh sáng và bóng đổ trên chủ thể để khớp hoàn hảo với nguồn sáng và môi trường của 'bối cảnh'.`;


        const prompt = `**Nhiệm vụ:** Ghép 'chủ thể đã tách nền' vào 'bối cảnh' một cách liền mạch và siêu thực.
        
**YÊU CẦU CỐT LÕI:**
1.  **${idDirectives.core}:** 'Chủ thể đã tách nền' là một lớp pixel hoàn hảo. ${idDirectives.face} Để đảm bảo điều này, hãy liên tục đối chiếu với 'ảnh khuôn mặt tham khảo chính'.

${locationInstruction}

3.  **Điều chỉnh Biểu cảm:** Thay đổi biểu cảm trên khuôn mặt của chủ thể để khớp với mô tả sau: "${artDirection.expression}". Việc này phải được thực hiện một cách tinh tế.

${lightingInstruction}

5.  **Kích thước & Tỷ lệ khung hình (QUY TẮC TUYỆT ĐỐI, KHÔNG ĐƯỢC THAY ĐỔI):**
    - Ảnh cuối cùng PHẢI có kích thước CHÍNH XÁC là ${backgroundWidth} pixel chiều rộng và ${backgroundHeight} pixel chiều cao.
    - Tỷ lệ khung hình của ảnh đầu ra PHẢI khớp 100% với 'bối cảnh'. KHÔNG ĐƯỢC CẮT xén hoặc thêm viền đen.
        
**Tinh chỉnh cuối cùng:**
- Phong cách nghệ thuật: ${artDirection.style}.
- Chất lượng: ${artDirection.quality}.
${artDirection.additionalPrompt ? `- Yêu cầu thêm: ${artDirection.additionalPrompt}` : ''}
        `;

        const parts: any[] = [
            { text: prompt },
            { text: "chủ thể đã tách nền (để ghép vào):" },
            { inlineData: { data: subjectBase64, mimeType: subjectMimeType } }, 
            { text: "bối cảnh (nền mới):" },
            { inlineData: { data: backgroundBase64, mimeType: backgroundFile.type } }
        ];
        
        if (referenceFace) {
            const faceBase64 = await fileToBase64(referenceFace.originalFile);
            parts.push({ text: "ảnh khuôn mặt tham khảo chính (để đối chiếu):" });
            parts.push({ inlineData: { data: faceBase64, mimeType: referenceFace.originalFile.type } });
        }


        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        return extractImageFromResponse(response, "Lỗi Bước 4 (Ghép cảnh)");
    } catch (error) {
        throw parseApiError(error, "Lỗi Bước 4 (Ghép cảnh)");
    }
};

const cleanBackground = async (ai: GoogleGenAI, backgroundFile: File): Promise<{ cleanedImage: string; extractedPose: ExtractedPose; }> => {
    const bgBase64 = await fileToBase64(backgroundFile);
    
    const prompt = `**Nhiệm vụ kép:**
1.  **Phân tích & Trích xuất Dữ liệu JSON:** Xác định người nổi bật nhất trong ảnh. Tạo một mô tả JSON về vị trí, tỷ lệ, góc độ, và ánh sáng của người đó. Cấu trúc JSON PHẢI là: \`{"location": string, "scale": string, "angle": string, "lighting": string}\`. Ví dụ: \`{"location": "đứng giữa con đường", "scale": "chiếm 1/4 chiều cao khung hình", "angle": "hơi nghiêng về bên trái", "lighting": "ánh sáng gắt từ trên cao bên phải"}\`.
2.  **Xóa người & Tái tạo nền:** Xóa TẤT CẢ mọi người khỏi ảnh và tái tạo lại phần nền bị che khuất một cách liền mạch.

**QUY TẮC ĐẦU RA:** Bạn PHẢI trả về CẢ hai phần:
- Một phần văn bản (text part) CHỈ chứa chuỗi JSON hợp lệ.
- Một phần hình ảnh (image part) chứa bối cảnh đã được làm sạch.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: bgBase64, mimeType: backgroundFile.type } },
                { text: prompt }
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    try {
        const candidate = response.candidates?.[0];
        if (!candidate) {
            const blockReason = response.promptFeedback?.blockReason;
            throw new Error(blockReason ? `Yêu cầu bị chặn: ${blockReason}` : 'API trả về phản hồi trống.');
        }

        const imagePart = candidate.content.parts.find(p => p.inlineData);
        const textPart = candidate.content.parts.find(p => p.text);

        if (!imagePart?.inlineData) {
            throw new Error('API không trả về hình ảnh đã được làm sạch.');
        }
        if (!textPart?.text || textPart.text.trim() === '') {
            throw new Error('API không trả về chuỗi JSON mô tả vị trí.');
        }

        const cleanedImage = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        
        let extractedPose: ExtractedPose;
        try {
            // Find JSON within ```json ... ``` block if it exists
            const jsonMatch = textPart.text.match(/```json\s*([\s\S]*?)\s*```/);
            const jsonString = jsonMatch ? jsonMatch[1] : textPart.text;
            extractedPose = JSON.parse(jsonString);
            // Basic validation
            if (typeof extractedPose.location !== 'string' || typeof extractedPose.scale !== 'string' || typeof extractedPose.angle !== 'string' || typeof extractedPose.lighting !== 'string') {
                 throw new Error("JSON trả về thiếu các trường bắt buộc hoặc sai kiểu dữ liệu.");
            }
        } catch (parseError) {
            console.error("Lỗi phân tích JSON từ AI, sẽ sử dụng toàn bộ văn bản làm mô tả vị trí:", parseError);
            // Fallback for when the model fails to produce valid JSON
            extractedPose = {
                location: textPart.text,
                scale: 'tỷ lệ không xác định',
                angle: 'góc độ không xác định',
                lighting: 'ánh sáng không xác định'
            };
        }

        return { cleanedImage, extractedPose };
    } catch (e) {
        throw parseApiError(e, "Lỗi làm sạch nền");
    }
};

const generateVariant = async (
    ai: GoogleGenAI, 
    baseImageSrc: string, 
    newPose: string
): Promise<string> => {
    const base64Data = baseImageSrc.split(',')[1];
    const mimeType = baseImageSrc.match(/data:(.*);base64/)?.[1] || 'image/png';

    const prompt = `**Nhiệm vụ:** Tạo một biến thể của hình ảnh gốc.
    
**Yêu cầu cốt lõi (ƯU TIÊN HÀNG ĐẦU): GIỮ NGUYÊN NHẬN DẠNG & BỐI CẢNH.**
1.  **Thay đổi duy nhất:** Chỉ thay đổi tư thế của nhân vật theo mô tả sau: "${newPose}".
2.  **Bảo toàn tuyệt đối:** Mọi yếu tố khác PHẢI được giữ nguyên 100% so với ảnh gốc:
    - **Nhận dạng:** Khuôn mặt, tóc, và trang phục phải khớp chính xác với nhân vật trong ảnh gốc.
    - **Bối cảnh:** Giữ nguyên bối cảnh.
    - **Phong cách nghệ thuật:** Giữ nguyên phong cách nghệ thuật.
    - **NGHIÊM CẤM** thay đổi bất cứ điều gì ngoài tư thế.
`;

    const parts = [
        { text: prompt },
        { text: "hình ảnh gốc (để tạo biến thể):" },
        { inlineData: { data: base64Data, mimeType: mimeType } },
    ];

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    return extractImageFromResponse(response, "Lỗi tạo biến thể");
};

// =================================================================================
// COMPONENTS
// =================================================================================

const PromptDisplay: React.FC<{ prompt: string | null; title: string; onSave: () => void }> = React.memo(({ prompt, title, onSave }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        if (prompt) {
            navigator.clipboard.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [prompt]);

    if (!prompt) {
        return null;
    }

    return (
        <div className="mt-4 p-3 bg-gray-900/70 border border-gray-700 rounded-lg">
            <div className="flex justify-between items-center mb-2 gap-2">
                <h4 className="text-sm font-semibold text-indigo-300">{title}</h4>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-md transition-colors"
                        title="Sao chép prompt"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2-2H9a2 2 0 01-2-2V9z" />
                            <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h6a2 2 0 00-2-2H5z" />
                        </svg>
                        {copied ? 'Đã chép' : 'Sao chép'}
                    </button>
                    <button
                        onClick={onSave}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-md transition-colors"
                        title="Lưu prompt thành tệp .txt"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Lưu
                    </button>
                </div>
            </div>
            <p className="text-xs text-gray-300 bg-gray-800 p-2 rounded-md whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                {prompt}
            </p>
        </div>
    );
});


const Spinner: React.FC = React.memo(() => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
));

const logoSrc = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTIwIDEwIEwyMCA5MCBMMzUgOTAgTDM1IDU1IEw2NSA5MCBMODAgOTAgTDQ1IDUwIEw4MCAxMCBMNjUgMTAgTDM1IDQ1IEwzNSAxMCBaIiAvPjxjaXJjbGUgY3g9Ijg1IiBjeT0iMTUiIHI9IjUiIGZpbGw9InJnYigxMjkgMTQwIDI0OCkiIC8+PC9zdmc+";

const Header: React.FC = React.memo(() => {
    return (
        <header className="bg-gray-900/70 backdrop-blur-lg sticky top-0 z-30 border-b border-gray-700/50">
            <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <img src={logoSrc} alt="KuL AI Studio Logo" className="h-8 w-8" />
                    <h1 className="text-lg sm:text-2xl font-bold tracking-tight whitespace-nowrap">
                        <span className="text-indigo-400">KuL</span> AI STUDIO PRO
                    </h1>
                </div>
            </div>
        </header>
    );
});

interface ImageModalProps {
    image: GeneratedImage;
    onClose: () => void;
    onGenerateVariant: (baseImage: GeneratedImage, newPose: string) => void;
    isGenerating: boolean;
}

const ImageModal: React.FC<ImageModalProps> = React.memo(({ image, onClose, onGenerateVariant, isGenerating }) => {
    const [newPose, setNewPose] = useState('');

    const handleGenerateClick = useCallback(() => {
        onGenerateVariant(image, newPose);
    }, [onGenerateVariant, image, newPose]);
    
    const handleDownload = useCallback(() => {
        const link = document.createElement('a');
        link.href = image.src;
        link.download = `ai-studio-pro-${image.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [image.src, image.id]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col md:flex-row gap-4 p-4" onClick={(e) => e.stopPropagation()}>
                <div className="w-full md:w-3/4 flex items-center justify-center bg-black/20 rounded-md overflow-hidden">
                    <img src={image.src} alt="Generated result detail" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="w-full md:w-1/4 flex flex-col space-y-4">
                    <div className="flex-grow flex flex-col space-y-4">
                        <h3 className="text-xl font-bold text-indigo-400 border-b border-gray-700 pb-2">Studio Biến thể</h3>
                        
                        <div className="bg-gray-700/50 p-4 rounded-lg flex-grow flex flex-col">
                            <h4 className="font-semibold mb-2">Tạo Biến thể Mới</h4>
                            <p className="text-sm text-gray-400 mb-3">Mô tả một tư thế mới. AI sẽ giữ nguyên mọi yếu tố khác.</p>
                            <textarea
                                value={newPose}
                                onChange={(e) => setNewPose(e.target.value)}
                                placeholder="ví dụ: 'ngồi trên ghế', 'vẫy tay chào'"
                                className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 text-white"
                                rows={4}
                            />
                            <button
                                onClick={handleGenerateClick}
                                disabled={isGenerating || !newPose}
                                className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center justify-center"
                            >
                                {isGenerating ? <Spinner/> : 'Tạo Biến thể'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-shrink-0 flex flex-col space-y-2">
                        <button 
                            onClick={handleDownload}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-lg transition duration-300 flex items-center justify-center gap-2"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            Tải ảnh xuống
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

interface ResultsGalleryProps {
    images: GeneratedImage[];
    onImageClick: (image: GeneratedImage) => void;
    isGenerating: boolean;
    generationTotal: number;
}

const WelcomePlaceholder = React.memo(() => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-800 border-2 border-dashed border-gray-700 rounded-xl">
        <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        </div>
        <h3 className="text-xl font-bold text-white">Chào mừng đến với Xưởng Ảnh AI</h3>
        <p className="text-gray-400 mt-2 max-w-md">
            Cung cấp các nguyên liệu ở bảng điều khiển bên trái, sau đó nhấn "Tạo ảnh" để xem kết quả kỳ diệu của bạn xuất hiện tại đây.
        </p>
    </div>
));

const SkeletonLoader: React.FC<{ count: number }> = React.memo(({ count }) => (
     <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-700 rounded-lg animate-pulse"></div>
        ))}
    </div>
));

const ErrorCard: React.FC<{ error: string }> = React.memo(({ error }) => (
    <div className="aspect-square bg-red-900/20 border-2 border-dashed border-red-500/50 rounded-lg flex flex-col items-center justify-center p-2 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400 mb-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <p className="text-xs font-semibold text-red-300">Tạo ảnh thất bại</p>
        <p className="text-xs text-red-400 mt-1 opacity-80 overflow-hidden" title={error}>{error}</p>
    </div>
));


const ResultsGallery: React.FC<ResultsGalleryProps> = React.memo(({ images, onImageClick, isGenerating, generationTotal }) => {
    
    const showWelcome = !isGenerating && images.length === 0;
    const showSkeleton = isGenerating && images.length === 0;

    return (
        <div className="flex-grow">
            <h2 className="text-2xl font-bold mb-4 text-indigo-400">Thư viện Kết quả</h2>
            {showWelcome ? (
                <WelcomePlaceholder />
            ) : showSkeleton ? (
                <SkeletonLoader count={generationTotal} />
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {images.map((image) => {
                        if (image.status === 'failed') {
                            return <ErrorCard key={image.id} error={image.error || 'Lỗi không xác định'} />;
                        }
                        return (
                            <div key={image.id} className="relative group cursor-pointer aspect-square fade-in-image" onClick={() => onImageClick(image)}>
                                <img src={image.src} alt="Generated result" className="rounded-lg object-cover w-full h-full transition-transform duration-300 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center rounded-lg">
                                    <p className="text-white opacity-0 group-hover:opacity-100 font-semibold transform group-hover:translate-y-0 translate-y-2 transition-all">Xem chi tiết</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
});

// --- Form Helper Components ---

const Label: React.FC<{htmlFor: string; children: React.ReactNode}> = React.memo(({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-300 mb-1">{children}</label>
));

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = React.memo((props) => (
    <input {...props} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
));

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = React.memo((props) => (
     <select {...props} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
));

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = React.memo((props) => (
    <textarea {...props} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
));

const ToggleSwitch: React.FC<{checked: boolean; onChange: (checked: boolean) => void; label: string; description?: string}> = React.memo(({ checked, onChange, label, description }) => (
    <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
        <div>
            <span className="text-sm font-medium text-gray-300">{label}</span>
            {description && <p className="text-xs text-gray-400">{description}</p>}
        </div>
        <button
            type="button"
            className={`${
                checked ? 'bg-indigo-600' : 'bg-gray-600'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 flex-shrink-0`}
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
        >
            <span
                className={`${
                    checked ? 'translate-x-6' : 'translate-x-1'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
        </button>
    </div>
));


// --- Form Section Components ---

interface ArtDirectionFormProps {
    artDirection: ArtDirection;
    onChange: (newArtDirection: Partial<ArtDirection>) => void;
}

const ArtDirectionForm: React.FC<ArtDirectionFormProps> = React.memo(({ artDirection, onChange }) => {
    
    const handleChange = useCallback(<K extends keyof ArtDirection>(key: K, value: ArtDirection[K]) => {
        onChange({ [key]: value });
    }, [onChange]);

    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="pose">Chủ đề Tư thế / Hành động</Label>
                <TextArea id="pose" value={artDirection.pose} onChange={(e) => handleChange('pose', e.target.value)} rows={3} placeholder="Gợi ý AI về hành động, ví dụ: 'thư giãn', 'đi dạo trên bãi biển'"/>
                <p className="text-xs text-gray-400 mt-1.5">
                    Mô tả này sẽ được dùng nếu bạn không ghi chú tư thế riêng cho từng ảnh nền.
                </p>
            </div>
            <div>
                <Label htmlFor="expression">Biểu cảm / Cảm xúc</Label>
                <TextArea id="expression" value={artDirection.expression} onChange={(e) => handleChange('expression', e.target.value)} rows={2} placeholder="ví dụ: 'mỉm cười nhẹ nhàng', 'vui vẻ', 'trầm tư'"/>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="art-style">Phong cách nghệ thuật</Label>
                    <Select id="art-style" value={artDirection.style} onChange={(e) => handleChange('style', e.target.value as ArtStyle)}>
                        {Object.values(ArtStyle).map(style => <option key={style} value={style}>{style}</option>)}
                    </Select>
                </div>
                 <div>
                    <Label htmlFor="quality">Chất lượng đầu ra</Label>
                    <Select id="quality" value={artDirection.quality} onChange={(e) => handleChange('quality', e.target.value as OutputQuality)}>
                        {Object.values(OutputQuality).map(q => <option key={q} value={q}>{q}</option>)}
                    </Select>
                </div>
            </div>
            <div>
                <Label htmlFor="additional-prompt">Yêu cầu thêm</Label>
                <TextArea id="additional-prompt" value={artDirection.additionalPrompt} onChange={(e) => handleChange('additionalPrompt', e.target.value)} rows={2} placeholder="ví dụ: 'thêm kính râm', 'ánh sáng điện ảnh'"/>
            </div>
             <div>
                <Label htmlFor="id-strictness">Mức độ Bám sát Nhận dạng ({artDirection.idStrictness})</Label>
                <input
                    id="id-strictness"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={artDirection.idStrictness}
                    onChange={(e) => handleChange('idStrictness', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Sáng tạo hơn</span>
                    <span>Chính xác hơn</span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                    Mức độ cao hơn sẽ buộc AI phải sao chép khuôn mặt một cách chính xác nhất, nhưng có thể làm ảnh trông cứng hơn.
                </p>
            </div>
            <div className="space-y-3">
                 <ToggleSwitch 
                    label="Tự động xóa người trong ảnh nền"
                    checked={artDirection.autoCleanBackgrounds}
                    onChange={(checked) => handleChange('autoCleanBackgrounds', checked)}
                    description="Xóa người khỏi nền & ghi nhớ vị trí để ghép."
                />
            </div>
        </div>
    );
});

interface CharacterProfileFormProps {
    profile: CharacterProfile;
    onChange: (newProfile: CharacterProfile) => void;
}

const CharacterProfileForm: React.FC<CharacterProfileFormProps> = React.memo(({ profile, onChange }) => {
    
    const handleChange = useCallback(<K extends keyof CharacterProfile>(key: K, value: CharacterProfile[K]) => {
        onChange({ ...profile, [key]: value });
    }, [profile, onChange]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="gender">Giới tính</Label>
                    <Select id="gender" value={profile.gender} onChange={(e) => handleChange('gender', e.target.value)}>
                        <option>Nam</option>
                        <option>Nữ</option>
                        <option>Phi nhị nguyên</option>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="age">Tuổi</Label>
                    <Input id="age" type="number" value={profile.age} onChange={(e) => handleChange('age', parseInt(e.target.value) || 0)} />
                </div>
                <div>
                    <Label htmlFor="height">Chiều cao</Label>
                    <Input id="height" type="text" value={profile.height} onChange={(e) => handleChange('height', e.target.value)} placeholder="ví dụ: 170cm hoặc 5'7&quot;" />
                </div>
                <div>
                    <Label htmlFor="weight">Cân nặng</Label>
                    <Input id="weight" type="text" value={profile.weight} onChange={(e) => handleChange('weight', e.target.value)} placeholder="ví dụ: 60kg hoặc 132lbs" />
                </div>
                <div className="sm:col-span-2">
                    <Label htmlFor="build">Dáng người (Build)</Label>
                    <Input 
                        id="build" 
                        type="text" 
                        value={profile.build} 
                        onChange={(e) => handleChange('build', e.target.value)} 
                        placeholder="ví dụ: mảnh mai, cơ bắp"
                    />
                </div>
            </div>
        </div>
    );
});

// --- ImageUploader Component ---

interface ImageUploaderProps {
    title: string;
    images: ImageFile[];
    onFilesAdded: (files: FileList) => void;
    onImageRemoved: (id: string) => void;
    id: string;
    multiple?: boolean;
    children?: React.ReactNode;
    extraButton?: {
        label: string;
        onClick: (id: string) => void;
        tooltip?: string;
    },
    onPoseChange?: (id: string, pose: string) => void;
    disabled?: boolean;
}

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const ShimmerPlaceholder: React.FC = () => (
    <div className="relative group aspect-square bg-gray-700 rounded-md animate-pulse"></div>
);

const ImageUploader: React.FC<ImageUploaderProps> = React.memo(({ title, images, onFilesAdded, onImageRemoved, id, multiple = false, children, extraButton, onPoseChange, disabled = false }) => {
    const [isProcessing, setIsProcessing] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = useCallback(async (files: FileList | null) => {
        if (files && files.length > 0 && !disabled) {
            setIsProcessing(files.length);
            await onFilesAdded(files);
            setIsProcessing(0);
        }
    }, [onFilesAdded, disabled]);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if(!disabled) setIsDragging(true);
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);
    
    const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation(); // Necessary to allow drop
    }, []);
    
    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length) {
            handleFileChange(files);
        }
    }, [handleFileChange]);

    const uploaderDisabledClass = disabled ? 'opacity-50 pointer-events-none' : '';

    return (
        <div className="space-y-3">
            <h3 className="text-md font-semibold text-gray-300">{title}</h3>
            <div className={`transition-opacity ${uploaderDisabledClass}`}>
                <div className="grid grid-cols-3 gap-2">
                    {images.map((image) => (
                        <div key={image.id} className="flex flex-col gap-1.5">
                            <div className="relative group aspect-square">
                                <img src={image.previewUrl} alt="preview" className="rounded-md object-cover w-full h-full" />
                                {image.extractedPose && (
                                    <div className="absolute top-1.5 right-1.5 bg-indigo-600 text-white rounded-full p-1 shadow-lg" title={`Vị trí đã ghi nhớ: ${image.extractedPose.location}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                                   <div className="flex items-center space-x-2">
                                        <button onClick={() => onImageRemoved(image.id)} className="p-2 bg-red-600/80 text-white rounded-full hover:bg-red-600 transform hover:scale-110 transition-all duration-200" title="Xóa">
                                            <TrashIcon />
                                        </button>
                                        {extraButton && (
                                             <button 
                                                onClick={() => extraButton.onClick(image.id)} 
                                                className="h-8 px-2 flex items-center justify-center bg-blue-600/80 text-white rounded-full hover:bg-blue-600 transform hover:scale-110 transition-all duration-200"
                                                title={extraButton.tooltip}
                                             >
                                                <span className="text-xs font-bold">{extraButton.label}</span>
                                             </button>
                                        )}
                                   </div>
                                </div>
                            </div>
                            {onPoseChange && (
                                <input
                                    type="text"
                                    placeholder="Tư thế cho cảnh này..."
                                    value={image.pose || ''}
                                    onChange={(e) => onPoseChange(image.id, e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full text-xs bg-gray-900 border border-gray-600 text-gray-200 rounded-md p-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-500"
                                />
                            )}
                        </div>
                    ))}
                    {Array.from({ length: isProcessing }).map((_, index) => <ShimmerPlaceholder key={`shim-${index}`} />)}
                    {(multiple || images.length === 0) && (
                         <label 
                            htmlFor={id} 
                            className={`flex flex-col items-center justify-center w-full aspect-square bg-gray-700/50 border-2 border-dashed border-gray-600 rounded-md transition-all duration-300 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-700 hover:border-indigo-500'} ${isDragging ? 'border-indigo-500 bg-gray-700 ring-2 ring-indigo-500' : ''}`}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            <UploadIcon />
                            <span className="mt-1 text-xs text-gray-400 text-center px-1">{isDragging ? 'Thả ảnh vào đây' : 'Kéo thả hoặc nhấn'}</span>
                            <input id={id} type="file" className="hidden" multiple={multiple} accept="image/*" onChange={(e) => handleFileChange(e.target.files)} disabled={disabled} />
                        </label>
                    )}
                </div>
            </div>
            {children}
        </div>
    );
});


// --- Main Input Panel ---

interface InputPanelProps {
    state: AppState;
    dispatch: React.Dispatch<Action>;
    addImageFiles: (files: FileList, type: 'backgrounds' | 'referenceFace' | 'additionalFaces' | 'outfit' | 'quickCompositeBackground') => void;
    removeImageFile: (id: string, type: keyof AppState) => void;
    onCleanBackground: (id: string) => void;
    onBackgroundPoseChange: (id: string, pose: string) => void;
    onCleanQuickCompositeBackground: () => void;
    onQuickComposite: () => void;
    handleSavePrompt: (text: string | null, type: 'face' | 'outfit') => void;
    handleLoadPrompt: (e: React.ChangeEvent<HTMLInputElement>, type: 'face' | 'outfit') => void;
}

const CollapsibleSection: React.FC<{title: string; number: number; isOpen: boolean; onClick: () => void; children: React.ReactNode}> = React.memo(({ title, number, isOpen, onClick, children }) => (
    <div className="border border-gray-700 rounded-xl overflow-hidden bg-gray-800/50">
        <button onClick={onClick} className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-700/50 transition-colors">
            <h3 className="text-lg font-semibold text-indigo-400 flex items-center gap-3">
                 <span className="flex items-center justify-center w-6 h-6 bg-indigo-600 rounded-full text-sm font-bold">{number}</span>
                {title}
            </h3>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
        </button>
        <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
                <div className="p-4 border-t border-gray-700">
                    {children}
                </div>
            </div>
        </div>
    </div>
));


const InputPanel: React.FC<InputPanelProps> = React.memo(({ 
    state,
    dispatch,
    addImageFiles, 
    removeImageFile,
    onCleanBackground,
    onBackgroundPoseChange,
    onCleanQuickCompositeBackground,
    onQuickComposite,
    handleSavePrompt,
    handleLoadPrompt,
}) => {
    const { settings, backgrounds, referenceFace, additionalFaces, outfit, isolatedSubjectSrc, quickCompositeBackground, aiGeneratedPrompts, userProvidedPrompts, isGenerating, isQuickCompositing } = state;

    const [openSection, setOpenSection] = useState<'assets' | 'profile' | 'art'>('assets');

    const toggleSection = useCallback((section: 'assets' | 'profile' | 'art') => {
        setOpenSection(prev => (prev === section ? '' : section) as 'assets' | 'profile' | 'art');
    }, []);

    const updateSettings = useCallback(<K extends keyof Settings>(key: K, value: any) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: { key, value } });
    }, [dispatch]);

    return (
        <div className="space-y-4">
            <CollapsibleSection title="Nguyên liệu Ảnh" number={1} isOpen={openSection === 'assets'} onClick={() => toggleSection('assets')}>
                <div className="space-y-6">
                    <ImageUploader 
                        title="Bối Cảnh (Ảnh Nền)"
                        images={backgrounds}
                        onFilesAdded={(files) => addImageFiles(files, 'backgrounds')}
                        onImageRemoved={(id) => removeImageFile(id, 'backgrounds')}
                        multiple
                        id="backgrounds-uploader"
                        extraButton={{
                            label: "Xóa Người",
                            onClick: onCleanBackground,
                            tooltip: "Xóa người & ghi nhớ vị trí trong ảnh nền"
                        }}
                        onPoseChange={onBackgroundPoseChange}
                    />
                    <ImageUploader 
                        title="Chủ Thể: Gương mặt tham khảo"
                        images={referenceFace ? [referenceFace] : []}
                        onFilesAdded={(files) => addImageFiles(files, 'referenceFace')}
                        onImageRemoved={(id) => removeImageFile(id, 'referenceFace')}
                        id="referenceFace-uploader"
                        disabled={!!userProvidedPrompts.face.trim()}
                    >
                         <div className="mt-3 space-y-3">
                            <div className="relative pt-2">
                                <span className="absolute -top-2 left-2 bg-gray-800 px-1 text-xs text-gray-400">Hoặc, nhập prompt trực tiếp</span>
                                <TextArea 
                                    rows={4}
                                    placeholder="Dán mô tả khuôn mặt chi tiết tại đây..."
                                    value={userProvidedPrompts.face}
                                    onChange={(e) => dispatch({ type: 'SET_USER_PROVIDED_PROMPT', payload: { key: 'face', prompt: e.target.value }})}
                                    className="border-gray-600"
                                />
                            </div>
                            <label className="text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer font-semibold">
                                Tải prompt từ tệp...
                                <input type="file" accept=".txt" className="hidden" onChange={(e) => handleLoadPrompt(e, 'face')} />
                            </label>
                         </div>
                         <PromptDisplay title="Prompt do AI tạo" prompt={aiGeneratedPrompts.face} onSave={() => handleSavePrompt(aiGeneratedPrompts.face, 'face')} />
                    </ImageUploader>
                     <ImageUploader 
                        title="Chủ Thể: Gương mặt bổ sung (Tùy chọn)"
                        images={additionalFaces}
                        onFilesAdded={(files) => addImageFiles(files, 'additionalFaces')}
                        onImageRemoved={(id) => removeImageFile(id, 'additionalFaces')}
                        multiple
                        id="additionalFaces-uploader"
                        disabled={!!userProvidedPrompts.face.trim()}
                    />
                    <ImageUploader 
                        title="Chủ Thể: Trang phục"
                        images={outfit ? [outfit] : []}
                        onFilesAdded={(files) => addImageFiles(files, 'outfit')}
                        onImageRemoved={(id) => removeImageFile(id, 'outfit')}
                        id="outfit-uploader"
                        disabled={!!userProvidedPrompts.outfit.trim()}
                    >
                        <div className="mt-3 space-y-3">
                             <div className={`transition-opacity ${!!userProvidedPrompts.outfit.trim() ? 'opacity-50 pointer-events-none' : ''}`}>
                                 <ToggleSwitch 
                                    label="Sử dụng màu gốc"
                                    checked={settings.useOriginalOutfitColor}
                                    onChange={(checked) => updateSettings('useOriginalOutfitColor', checked)}
                                />
                                <div className={settings.useOriginalOutfitColor ? 'opacity-50 transition-opacity mt-3' : 'transition-opacity mt-3'}>
                                    <label htmlFor="outfit-color" className="block text-sm font-medium text-gray-300 mb-1">Màu sắc chủ đạo của trang phục</label>
                                    <input 
                                        type="color" 
                                        id="outfit-color" 
                                        value={settings.outfitColor}
                                        onChange={(e) => updateSettings('outfitColor', e.target.value)}
                                        className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-md cursor-pointer disabled:cursor-not-allowed"
                                        disabled={settings.useOriginalOutfitColor}
                                    />
                                </div>
                            </div>
                             <div className="relative pt-2">
                                <span className="absolute -top-2 left-2 bg-gray-800 px-1 text-xs text-gray-400">Hoặc, nhập prompt trực tiếp</span>
                                <TextArea 
                                    rows={4}
                                    placeholder="Dán mô tả trang phục chi tiết tại đây..."
                                    value={userProvidedPrompts.outfit}
                                    onChange={(e) => dispatch({ type: 'SET_USER_PROVIDED_PROMPT', payload: { key: 'outfit', prompt: e.target.value }})}
                                    className="border-gray-600"
                                />
                            </div>
                             <label className="text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer font-semibold">
                                Tải prompt từ tệp...
                                <input type="file" accept=".txt" className="hidden" onChange={(e) => handleLoadPrompt(e, 'outfit')} />
                            </label>
                        </div>
                         <PromptDisplay title="Prompt do AI tạo" prompt={aiGeneratedPrompts.outfit} onSave={() => handleSavePrompt(aiGeneratedPrompts.outfit, 'outfit')} />
                    </ImageUploader>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Hồ sơ Nhân vật" number={2} isOpen={openSection === 'profile'} onClick={() => toggleSection('profile')}>
                <CharacterProfileForm 
                    profile={settings.characterProfile}
                    onChange={(newProfile) => updateSettings('characterProfile', newProfile)}
                />
            </CollapsibleSection>

            <CollapsibleSection title="Tùy chỉnh Sáng tạo" number={3} isOpen={openSection === 'art'} onClick={() => toggleSection('art')}>
                <ArtDirectionForm 
                    artDirection={settings.artDirection}
                    onChange={(newArtDirection) => updateSettings('artDirection', newArtDirection)}
                />
                 <div className="mt-6 pt-6 border-t border-gray-700">
                    <h3 className="text-md font-semibold text-gray-300 mb-3">Studio Ghép Nhanh</h3>
                    {!isolatedSubjectSrc ? (
                        <div className="p-4 text-center bg-gray-700/50 rounded-lg">
                            <p className="text-sm text-gray-400">Tạo ảnh ít nhất một lần để kích hoạt tính năng này. Chủ thể đã được tách nền sẽ được lưu lại để bạn có thể ghép vào các bối cảnh mới một cách nhanh chóng.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <ImageUploader 
                                title="Bối Cảnh Mới"
                                images={quickCompositeBackground ? [quickCompositeBackground] : []}
                                onFilesAdded={(files) => addImageFiles(files, 'quickCompositeBackground')}
                                onImageRemoved={(id) => removeImageFile(id, 'quickCompositeBackground')}
                                id="quick-composite-uploader"
                                extraButton={{
                                    label: "Xóa Người",
                                    onClick: onCleanQuickCompositeBackground,
                                    tooltip: "Xóa người & ghi nhớ vị trí trong ảnh nền"
                                }}
                            />
                            <button
                                onClick={onQuickComposite}
                                disabled={isGenerating || isQuickCompositing || !quickCompositeBackground}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-900 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 flex items-center justify-center"
                            >
                                {isQuickCompositing ? <Spinner/> : 'Ghép vào cảnh mới'}
                            </button>
                        </div>
                    )}
                </div>
            </CollapsibleSection>
        </div>
    );
});

// =================================================================================
// MAIN APP COMPONENT
// =================================================================================

const initialAppState: AppState = {
    backgrounds: [],
    referenceFace: null,
    additionalFaces: [],
    outfit: null,
    settings: {
        outfitColor: '#ffffff',
        useOriginalOutfitColor: false,
        characterProfile: {
            gender: 'Nam',
            age: 2,
            height: '90cm',
            weight: '12kg',
            build: 'Dáng người cân đối theo tuổi',
        },
        artDirection: {
            pose: 'đứng tự tin, tương tác tự nhiên với bối cảnh',
            style: ArtStyle.PHOTOGRAPHIC,
            quality: OutputQuality.DEFAULT,
            additionalPrompt: '',
            preserveFace: true, // Legacy, functionality now controlled by idStrictness
            autoCleanBackgrounds: true,
            expression: 'biểu cảm tự nhiên theo bối cảnh',
            idStrictness: 90,
        },
    },
    generatedImages: [],
    isGenerating: false,
    generationProgress: { current: 0, total: 0, step: '' },
    error: null,
    isolatedSubjectSrc: null,
    quickCompositeBackground: null,
    isQuickCompositing: false,
    aiGeneratedPrompts: { face: null, outfit: null },
    userProvidedPrompts: { face: '', outfit: '' },
};

const App: React.FC = () => {
    const [apiKeyIsMissing, setApiKeyIsMissing] = useState(false);
    const [state, dispatch] = useReducer(appReducer, initialAppState);
    const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

    useEffect(() => {
        // Diagnostic check for API key on application load.
        // The value 'undefined' is a string because of how Vite's `define` works.
        if (!process.env.API_KEY || process.env.API_KEY === 'undefined' || process.env.API_KEY === '') {
            setApiKeyIsMissing(true);
        }
    }, []);

    const addImageFiles = useCallback(async (files: FileList, type: 'backgrounds' | 'referenceFace' | 'additionalFaces' | 'outfit' | 'quickCompositeBackground') => {
        const imageFilePromises = Array.from(files).map(async (file): Promise<ImageFile> => {
            const preview = await createImagePreview(file, 200, 200);
            return { id: `${file.name}-${Date.now()}`, originalFile: file, previewUrl: preview, pose: '', extractedPose: undefined };
        });
        const newImageFiles = await Promise.all(imageFilePromises);
        dispatch({ type: 'ADD_IMAGE_FILES', payload: { type, files: newImageFiles } });
    }, []);

    const removeImageFile = useCallback((id: string, type: keyof AppState) => {
        dispatch({ type: 'REMOVE_IMAGE_FILE', payload: { type, id } });
    }, []);

    const handleBackgroundPoseChange = useCallback((id: string, pose: string) => {
        dispatch({ type: 'UPDATE_BACKGROUND_POSE', payload: { id, pose } });
    }, []);

    const handleCleanBackground = useCallback(async (backgroundId: string) => {
        const backgroundToClean = state.backgrounds.find(bg => bg.id === backgroundId);
        if (!backgroundToClean) return;

        dispatch({ type: 'SET_ERROR', payload: null });
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const { cleanedImage: cleanedImageBase64, extractedPose } = await cleanBackground(ai, backgroundToClean.originalFile);
            
            const newFile = await (await fetch(cleanedImageBase64)).blob();
            const cleanedFile = new File([newFile], `cleaned_${backgroundToClean.originalFile.name}`, { type: newFile.type });

            const newPreview = await createImagePreview(cleanedFile, 200, 200);
            const newImageFile: ImageFile = { 
                ...backgroundToClean, 
                originalFile: cleanedFile, 
                previewUrl: newPreview,
                extractedPose: extractedPose, // Store the extracted pose
            };

            dispatch({ type: 'REPLACE_BACKGROUND', payload: { id: backgroundId, newFile: newImageFile } });

        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định khi làm sạch nền.";
            dispatch({ type: 'SET_ERROR', payload: message });
        }
    }, [state.backgrounds]);
    
    const handleGenerateImages = useCallback(async () => {
        const { referenceFace, outfit, backgrounds, isGenerating, userProvidedPrompts } = state;

        const isFaceReady = referenceFace || userProvidedPrompts.face.trim();
        const isOutfitReady = outfit || userProvidedPrompts.outfit.trim();

        if (!isFaceReady || !isOutfitReady || backgrounds.length === 0 || isGenerating) {
            alert("Vui lòng cung cấp (ảnh hoặc prompt) cho khuôn mặt, (ảnh hoặc prompt) cho trang phục, và ít nhất một ảnh nền.");
            return;
        }
        
        const faceAnalysisSteps = userProvidedPrompts.face.trim() ? 0 : 1;
        const outfitAnalysisSteps = userProvidedPrompts.outfit.trim() ? 0 : 1;
        const cleaningSteps = state.settings.artDirection.autoCleanBackgrounds ? state.backgrounds.length : 0;
        const totalSteps = faceAnalysisSteps + outfitAnalysisSteps + 2 + cleaningSteps + state.backgrounds.length; // 2 = create master + isolate
    
        dispatch({ type: 'START_GENERATION', payload: { total: totalSteps } });
    
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
        try {
            let currentStep = 1;
            let faceDescription: string;
            let outfitDescription: string;

            // Step 1a: Get Face Description
            if (userProvidedPrompts.face.trim()) {
                faceDescription = userProvidedPrompts.face.trim();
                 if (faceAnalysisSteps === 0 && outfitAnalysisSteps === 1) { // Only log step if it's meaningful
                    dispatch({ type: 'UPDATE_PROGRESS', payload: { current: 0, step: `Bước 1: Bỏ qua phân tích mặt, dùng prompt có sẵn...` } });
                }
            } else {
                dispatch({ type: 'UPDATE_PROGRESS', payload: { current: currentStep++, step: `Bước 1a: Phân tích khuôn mặt...` } });
                faceDescription = await describeFace(ai, state.referenceFace!, state.additionalFaces);
                dispatch({ type: 'SET_AI_GENERATED_PROMPT', payload: { key: 'face', prompt: faceDescription } });
            }
    
            // Step 1b: Get Outfit Description
            if (userProvidedPrompts.outfit.trim()) {
                outfitDescription = userProvidedPrompts.outfit.trim();
                 if (outfitAnalysisSteps === 0 && faceAnalysisSteps === 1) { // Only log step if it's meaningful
                     dispatch({ type: 'UPDATE_PROGRESS', payload: { current: currentStep++, step: `Bước 1b: Bỏ qua phân tích trang phục...` } });
                }
            } else {
                 dispatch({ type: 'UPDATE_PROGRESS', payload: { current: currentStep++, step: `Bước 1b: Phân tích trang phục...` } });
                outfitDescription = await describeOutfit(ai, state.outfit!, state.settings.useOriginalOutfitColor, state.settings.outfitColor);
                dispatch({ type: 'SET_AI_GENERATED_PROMPT', payload: { key: 'outfit', prompt: outfitDescription } });
            }

            // Workflow Step 2: Create the master subject from descriptions
            dispatch({ type: 'UPDATE_PROGRESS', payload: { current: currentStep++, step: `Bước 2: Tạo chủ thể gốc...` } });
            const masterSubjectImage = await createMasterSubject(
                ai, 
                faceDescription, 
                outfitDescription, 
                state.settings.characterProfile, 
                state.settings.artDirection,
                state.referenceFace,
                state.additionalFaces
            );
    
            // Workflow Step 3: Isolate the subject (remove background)
            dispatch({ type: 'UPDATE_PROGRESS', payload: { current: currentStep++, step: `Bước 3: Tách nền chủ thể...` } });
            const isolatedSubject = await isolateSubject(ai, masterSubjectImage);
            dispatch({ type: 'SET_ISOLATED_SUBJECT', payload: isolatedSubject });
    
            // Workflow Step 4: Process each background (clean + composite)
            const generationPromises = state.backgrounds.map(async (background, index) => {
                let currentBackgroundFile = background.originalFile;
                let currentExtractedPose = background.extractedPose;
                
                // Step 4a: Auto-clean background if enabled AND not already cleaned
                if (state.settings.artDirection.autoCleanBackgrounds && !background.originalFile.name.startsWith('cleaned_')) {
                    dispatch({ type: 'UPDATE_PROGRESS', payload: { current: currentStep++, step: `Làm sạch nền ${index + 1}/${state.backgrounds.length}...` } });
                    try {
                        const { cleanedImage, extractedPose } = await cleanBackground(ai, background.originalFile);
                        const blob = await (await fetch(cleanedImage)).blob();
                        currentBackgroundFile = new File([blob], `cleaned_${background.originalFile.name}`, { type: blob.type });
                        currentExtractedPose = extractedPose;
                    } catch (cleanError) {
                        console.warn(`Could not clean background ${index + 1}, using original. Error:`, cleanError);
                    }
                }
                
                // Step 4b: Composite subject into the (potentially cleaned) scene
                dispatch({ type: 'UPDATE_PROGRESS', payload: { current: currentStep++, step: `Ghép cảnh ${index + 1}/${state.backgrounds.length}...` } });
                
                const { width, height } = await getImageDimensions(currentBackgroundFile);

                const artDirectionForScene: ArtDirection = {
                    ...state.settings.artDirection,
                    pose: background.pose?.trim() ? background.pose : state.settings.artDirection.pose,
                };
    
                return compositeSubjectIntoScene(
                    ai,
                    isolatedSubject,
                    currentBackgroundFile,
                    artDirectionForScene,
                    state.referenceFace,
                    width,
                    height,
                    currentExtractedPose,
                );
            });

            const results = await Promise.allSettled(generationPromises);

            const newImages: GeneratedImage[] = results.map((result, i) => {
                const background = state.backgrounds[i];
                if (result.status === 'fulfilled') {
                    return {
                        id: `gen-${Date.now()}-${i}`,
                        src: result.value,
                        sourceBackgroundId: background.id,
                        status: 'success'
                    };
                } else {
                    const errorMessage = result.reason instanceof Error ? result.reason.message : "Lỗi không xác định";
                    console.error(`Lỗi khi tạo ảnh cho nền ${i+1}:`, errorMessage);
                    return {
                        id: `fail-${Date.now()}-${i}`,
                        src: '',
                        sourceBackgroundId: background.id,
                        status: 'failed',
                        error: `Lỗi tạo ảnh: ${errorMessage}`
                    };
                }
            });

            dispatch({ type: 'ADD_GENERATED_IMAGES', payload: newImages });
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : `Lỗi nghiêm trọng: ${String(error)}`;
            console.error("Lỗi trong quá trình tạo ảnh:", error);
            dispatch({ type: 'SET_ERROR', payload: errorMessage });
        } finally {
            dispatch({ type: 'FINISH_GENERATION' });
        }
    }, [state]);

    const handleGenerateVariant = useCallback(async (baseImage: GeneratedImage, newPose: string) => {
        if (!newPose.trim()) {
            alert("Vui lòng cung cấp mô tả tư thế mới.");
            return;
        }
        
        dispatch({ type: 'SET_ERROR', payload: null });
        setSelectedImage(null); // Close modal

        try {
             const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
             const variantBase64 = await generateVariant(ai, baseImage.src, newPose);
             const newImage: GeneratedImage = { 
                id: `var-${Date.now()}`, 
                src: variantBase64, 
                sourceBackgroundId: baseImage.sourceBackgroundId,
                status: 'success' 
            };
            dispatch({ type: 'ADD_GENERATED_IMAGES', payload: [newImage] });
        } catch (error) {
            console.error("Variant generation failed:", error);
            const message = error instanceof Error ? error.message : "Tạo biến thể thất bại.";
            dispatch({ type: 'SET_ERROR', payload: message });
        }
    }, []);

    const handleCleanQuickCompositeBackground = useCallback(async () => {
        if (!state.quickCompositeBackground) return;
    
        dispatch({ type: 'SET_ERROR', payload: null });
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const { cleanedImage: cleanedImageBase64, extractedPose } = await cleanBackground(ai, state.quickCompositeBackground.originalFile);
            
            const newFile = await (await fetch(cleanedImageBase64)).blob();
            const cleanedFile = new File([newFile], `cleaned_${state.quickCompositeBackground.originalFile.name}`, { type: newFile.type });
    
            const newPreview = await createImagePreview(cleanedFile, 200, 200);
            const newImageFile: ImageFile = { 
                ...state.quickCompositeBackground, 
                originalFile: cleanedFile, 
                previewUrl: newPreview,
                extractedPose: extractedPose,
            };
    
            dispatch({ type: 'REPLACE_QUICK_COMPOSITE_BACKGROUND', payload: newImageFile });
    
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định khi làm sạch nền.";
            dispatch({ type: 'SET_ERROR', payload: message });
        }
    }, [state.quickCompositeBackground]);

    const handleQuickComposite = useCallback(async () => {
        if (!state.isolatedSubjectSrc || !state.quickCompositeBackground || state.isGenerating || state.isQuickCompositing) {
            return;
        }
        dispatch({ type: 'SET_QUICK_COMPOSITING', payload: true });
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const { width, height } = await getImageDimensions(state.quickCompositeBackground.originalFile);
    
            const newImageSrc = await compositeSubjectIntoScene(
                ai, 
                state.isolatedSubjectSrc, 
                state.quickCompositeBackground.originalFile, 
                state.settings.artDirection,
                state.referenceFace,
                width,
                height,
                state.quickCompositeBackground.extractedPose,
            );
    
            const newImage: GeneratedImage = {
                id: `q-gen-${Date.now()}`,
                src: newImageSrc,
                sourceBackgroundId: state.quickCompositeBackground.id,
                status: 'success'
            };
            
            dispatch({ type: 'ADD_GENERATED_IMAGES', payload: [newImage] });
    
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Lỗi không xác định";
            console.error("Lỗi khi ghép ảnh nhanh:", errorMessage);
            dispatch({ type: 'SET_ERROR', payload: `Lỗi ghép ảnh nhanh: ${errorMessage}` });
        } finally {
            dispatch({ type: 'SET_QUICK_COMPOSITING', payload: false });
        }
    }, [state.isolatedSubjectSrc, state.quickCompositeBackground, state.settings.artDirection, state.isGenerating, state.isQuickCompositing, state.referenceFace]);
    
    const handleSavePrompt = useCallback((text: string | null, type: 'face' | 'outfit') => {
        if (!text) return;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kul-ai-${type}-prompt.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, []);

    const handleLoadPrompt = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'face' | 'outfit') => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                dispatch({ type: 'SET_USER_PROVIDED_PROMPT', payload: { key: type, prompt: text } });
            };
            reader.readAsText(file);
        }
        e.target.value = ''; // Reset input for same-file uploads
    }, []);

    const closeImageModal = useCallback(() => setSelectedImage(null), []);

    if (apiKeyIsMissing) {
        return <ApiKeyErrorScreen />;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col">
            <Header />

            <main className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 p-4 md:p-8 flex-grow">
                <div className="md:col-span-1 lg:col-span-1">
                    <InputPanel
                        state={state}
                        dispatch={dispatch}
                        addImageFiles={addImageFiles}
                        removeImageFile={removeImageFile}
                        onCleanBackground={handleCleanBackground}
                        onBackgroundPoseChange={handleBackgroundPoseChange}
                        onCleanQuickCompositeBackground={handleCleanQuickCompositeBackground}
                        onQuickComposite={handleQuickComposite}
                        handleSavePrompt={handleSavePrompt}
                        handleLoadPrompt={handleLoadPrompt}
                    />
                </div>

                <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-8">
                    <div className="md:sticky md:top-8 z-10">
                         <div className="bg-gray-800/80 backdrop-blur-md p-6 rounded-xl border border-gray-700 shadow-2xl">
                            <h2 className="text-2xl font-bold mb-4 text-indigo-400">Bảng điều khiển</h2>
                            <button
                                onClick={handleGenerateImages}
                                disabled={state.isGenerating || state.isQuickCompositing || state.backgrounds.length === 0 || (!state.referenceFace && !state.userProvidedPrompts.face.trim()) || (!state.outfit && !state.userProvidedPrompts.outfit.trim())}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 text-lg flex items-center justify-center shadow-lg hover:shadow-indigo-500/50"
                            >
                                {state.isGenerating ? <Spinner /> : `Tạo ${state.backgrounds.length} ảnh`}
                            </button>
                            {state.isGenerating && (
                                <div className="mt-4 text-center">
                                    <p className="font-semibold">{state.generationProgress.step || `Đang tạo ${state.generationProgress.current} / ${state.generationProgress.total}...`}</p>
                                    <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2 overflow-hidden">
                                        <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${state.generationProgress.total > 0 ? (state.generationProgress.current / state.generationProgress.total) * 100 : 0}%` }}></div>
                                    </div>
                                </div>
                            )}
                            {state.error && <p className="text-red-400 mt-4 text-center font-semibold animate-pulse">{state.error}</p>}
                        </div>
                    </div>

                    <ResultsGallery
                        images={state.generatedImages}
                        onImageClick={setSelectedImage}
                        isGenerating={state.isGenerating}
                        generationTotal={state.backgrounds.length}
                    />
                </div>
            </main>

            {selectedImage && (
                <ImageModal
                    image={selectedImage}
                    onClose={closeImageModal}
                    onGenerateVariant={handleGenerateVariant}
                    isGenerating={state.isGenerating || state.isQuickCompositing}
                />
            )}
            
            <footer className="w-full text-center py-4 px-4 text-gray-500 text-sm mt-auto">
                © 2025 by Kul | Liên hệ: 0826226888
            </footer>
        </div>
    );
};

// =================================================================================
// RENDER APP
// =================================================================================

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
