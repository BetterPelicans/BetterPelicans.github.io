import{t as e}from"./shaderStore-DPDocHS6.js";import{n as t,t as n}from"./clipPlaneFragment-3U75F5tW.js";import{n as r,t as i}from"./fogFragment-DtCixiuf.js";import{t as a}from"./logDepthDeclaration-08Cybpt4.js";import{t as o}from"./logDepthFragment-n_0kyr_W.js";var s=`packingFunctions`,c=`vec4 pack(float depth)
{const vec4 bit_shift=vec4(255.0*255.0*255.0,255.0*255.0,255.0,1.0);const vec4 bit_mask=vec4(0.0,1.0/255.0,1.0/255.0,1.0/255.0);vec4 res=fract(depth*bit_shift);res-=res.xxyz*bit_mask;return res;}
float unpack(vec4 color)
{const vec4 bit_shift=vec4(1.0/(255.0*255.0*255.0),1.0/(255.0*255.0),1.0/255.0,1.0);return dot(color,bit_shift);}`;e.IncludesShadersStore[s]||(e.IncludesShadersStore[s]=c);var l={name:s,shader:c},u=`gaussianSplattingFragmentDeclaration`,d=`vec4 gaussianColor(vec4 inColor)
{float A=-dot(vPosition,vPosition);if (A<-4.0) discard;float B=exp(A)*inColor.a;
#include<logDepthFragment>
vec3 color=inColor.rgb;
#ifdef FOG
#include<fogFragment>
#endif
return vec4(color,B);}
`;e.IncludesShadersStore[u]||(e.IncludesShadersStore[u]=d);var f={name:u,shader:d},p=`gaussianSplattingPixelShader`,m=`#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#ifdef GPUPICKER_DEPTH
layout(location=0) out highp vec4 glFragData[2];
#endif
#ifdef GPUPICKER_PACK_DEPTH
#include<packingFunctions>
#endif
varying vec4 vColor;varying vec2 vPosition;
#define CUSTOM_FRAGMENT_DEFINITIONS
#include<gaussianSplattingFragmentDeclaration>
void main () {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
vec4 finalColor=gaussianColor(vColor);
#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR
#ifdef GPUPICKER_DEPTH
glFragData[0]=finalColor;
#ifdef GPUPICKER_PACK_DEPTH
glFragData[1]=pack(gl_FragCoord.z);
#else
glFragData[1]=vec4(gl_FragCoord.z,0.0,0.0,1.0);
#endif
#else
gl_FragColor=finalColor;
#endif
#define CUSTOM_FRAGMENT_MAIN_END
}
`;e.ShadersStore[p]||(e.ShadersStore[p]=m);var h=[t,a,r,l,o,i,f,n];for(let t of h)e.IncludesShadersStore[t.name]||(e.IncludesShadersStore[t.name]=t.shader);var g={name:p,shader:m};export{g as gaussianSplattingPixelShader};