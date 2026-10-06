import {courseDirectories,loadCourseBundle} from "@discere/curriculum";
import{assessNumericAnswer,assessTextAnswer}from"../packages/assessment-engine/src/index.js";
import{writeFile}from"node:fs/promises";import path from"node:path";
const report={courses:[],numeric:0,text:0,variants:0,failures:[]};
for(const directory of await courseDirectories("content")){
 const b=await loadCourseBundle(path.join("content",directory,"bundle.json"));
 if(b.course.catalogueVisibility==="archived")continue;
 let numeric=0,text=0;
 const questions=[...b.questions,...(b.flashcards??[]).filter(c=>c.answerAuthority),...(b.courseChecks??[]).flatMap(check=>check.items.map(item=>item.question))];
 for(const q of questions){
  const a=q.answerAuthority;if(!a)continue;
  if(a.kind==="numeric"){
   numeric++;const inputs=[String(a.value),String(a.value)+"e0"];
   if(a.unit)inputs.push(String(a.value)+" "+a.unit);
   if(a.unit==="probability")inputs.push(String(a.value*100)+"%");
   for(const input of inputs){report.variants++;if(!assessNumericAnswer(input,a).correct)report.failures.push({course:b.course.id,id:q.id,input});}
   for(const input of ["", "Infinity", "1/0", String(a.value)+" plus "+String(a.value),"I don't know"]){
    report.variants++;if(assessNumericAnswer(input,a).correct)report.failures.push({course:b.course.id,id:q.id,falsePositive:input});
   }
  }else if(a.kind==="text"){
   text++;const input=a.acceptedIdeas.join("; ");report.variants++;
   if(!assessTextAnswer(input,a).correct)report.failures.push({course:b.course.id,id:q.id,rubricSelfConflict:true});
  }
 }
 report.numeric+=numeric;report.text+=text;report.courses.push({id:b.course.id,numeric,text});
}
await writeFile("docs/production-readiness/grading-audit.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report));if(report.failures.length)process.exitCode=1;